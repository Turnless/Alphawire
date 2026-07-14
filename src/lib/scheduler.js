import cron from 'node-cron';
import { getETFFlows, getAINewsFeed, getSectorPerformance } from './sosovalue.js';
import { updateNarrativeTemperatures } from '../engine/narrative.js';
import { checkMarketAndTrade, executeStopLossMonitoring } from '../engine/trade-engine.js';
import { query, execute } from './db.js';
import { generateMarketPulse, generateDailyDeepDive } from './openai.js';

console.log('⏰ Initializing Cinder Scheduler...');

/**
 * Caches news items from SoSoValue AI news feed into local database.
 */
async function cacheNewsItems(news) {
  if (!news || news.length === 0) return;
  for (const item of news) {
    await execute(
      `INSERT INTO news_items (id, title, summary, source, keywords, sentiment, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         summary = excluded.summary,
         sentiment = excluded.sentiment,
         keywords = excluded.keywords`,
      [
        item.id,
        item.title,
        item.summary || null,
        item.source || null,
        JSON.stringify(item.keywords || []),
        item.sentiment !== undefined ? item.sentiment : null,
        item.publishedAt || new Date().toISOString()
      ]
    );
  }
}

/**
 * Caches ETF flows for BTC and ETH in the local database.
 */
async function cacheEtfFlows(flows, asset) {
  if (!flows || flows.length === 0) return;
  for (const item of flows) {
    const id = `${asset}_${item.date}`;
    await execute(
      `INSERT INTO etf_flows (id, asset, date, net_flow, total_net_assets, details, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         net_flow = excluded.net_flow,
         total_net_assets = excluded.total_net_assets,
         details = excluded.details`,
      [
        id,
        asset,
        item.date,
        item.netFlow || 0,
        item.totalNetAssets || 0,
        JSON.stringify(item.details || []),
        new Date().toISOString()
      ]
    );
  }
}

/**
 * Caches sector performance data in local database.
 */
async function cacheSectors(sectors) {
  if (!sectors || sectors.length === 0) return;
  for (const item of sectors) {
    await execute(
      `INSERT INTO sector_data (sector, performance_7d, performance_30d, correlation_btc, constituents, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        item.displayName || item.indexName,
        item.performance7d || 0,
        item.performance30d || 0,
        item.correlationToBtc || 0,
        JSON.stringify(item.tokens || []),
        new Date().toISOString()
      ]
    );
  }
}

/**
 * Fetches latest indicators and narrative states, invokes OpenAI, and publishes a Cinder Market Pulse story.
 */
export async function generateAndPublishMarketPulse() {
  console.log('📰 Generating 4-hourly Cinder Market Pulse story...');
  try {
    const btcFlows = await getETFFlows('BTC', 1);
    const ethFlows = await getETFFlows('ETH', 1);
    const btcFlowStr = btcFlows && btcFlows[0] ? `$${(btcFlows[0].netFlow / 1e6).toFixed(1)}M` : 'N/A';
    const ethFlowStr = ethFlows && ethFlows[0] ? `$${(ethFlows[0].netFlow / 1e6).toFixed(1)}M` : 'N/A';

    const sectors = await getSectorPerformance();
    let topSector = 'N/A';
    let topSectorReturn = '0.0%';
    let bottomSector = 'N/A';
    let bottomSectorReturn = '0.0%';

    if (sectors && sectors.length > 0) {
      const sortedSectors = [...sectors].sort((a, b) => (b.performance7d || 0) - (a.performance7d || 0));
      const top = sortedSectors[0];
      const bottom = sortedSectors[sortedSectors.length - 1];
      if (top) {
        topSector = top.displayName || top.indexName;
        topSectorReturn = `${(top.performance7d * 100).toFixed(2)}%`;
      }
      if (bottom) {
        bottomSector = bottom.displayName || bottom.indexName;
        bottomSectorReturn = `${(bottom.performance7d * 100).toFixed(2)}%`;
      }
    }

    const news = await getAINewsFeed(5);
    const headlines = news ? news.map(n => n.title) : [];

    const narrativeHistory = await query(
      `SELECT temperature FROM narrative_history WHERE narrative_id = 'NAR_01' ORDER BY recorded_at DESC LIMIT 1`
    );
    const narrativeTemp = narrativeHistory && narrativeHistory[0] ? narrativeHistory[0].temperature : '50.0';

    const body = await generateMarketPulse({
      btcFlow: btcFlowStr,
      ethFlow: ethFlowStr,
      topSector,
      topSectorReturn,
      bottomSector,
      bottomSectorReturn,
      headlines,
      narrativeTemp
    });

    let title = `Market Pulse: ETF Flows & Sector Rotation`;
    const lines = body.split('\n');
    const firstLine = lines[0]?.trim() || '';
    if (firstLine.startsWith('#')) {
      title = firstLine.replace(/^#+\s*/, '');
    }

    const id = `pulse_${Date.now()}`;
    const publishedAt = new Date().toISOString();
    const summary = `BTC net flow: ${btcFlowStr}, ETH net flow: ${ethFlowStr}. Top performing sector: ${topSector}.`;

    const currentTemps = {};
    const latestTemps = await query(
      `SELECT nh.narrative_id, nh.temperature
       FROM narrative_history nh
       INNER JOIN (
         SELECT narrative_id, MAX(recorded_at) as max_recorded
         FROM narrative_history
         GROUP BY narrative_id
       ) latest ON nh.narrative_id = latest.narrative_id AND nh.recorded_at = latest.max_recorded`
    );
    for (const t of latestTemps) {
      currentTemps[t.narrative_id] = t.temperature;
    }

    const chartData = {
      etf_flows: [
        { date: new Date().toISOString().split('T')[0], net_flow: btcFlows && btcFlows[0] ? btcFlows[0].netFlow : 0, asset: 'BTC' },
        { date: new Date().toISOString().split('T')[0], net_flow: ethFlows && ethFlows[0] ? ethFlows[0].netFlow : 0, asset: 'ETH' }
      ],
      sectors: sectors ? sectors.map(s => ({
        sector: s.displayName || s.indexName,
        performance_7d: parseFloat((s.performance7d * 100).toFixed(2)),
        performance_30d: parseFloat((s.performance30d * 100).toFixed(2)),
        correlation_btc: s.correlationToBtc
      })) : []
    };

    await execute(
      `INSERT INTO stories (id, type, title, body, summary, chart_data, narrative_state, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        'pulse',
        title,
        body,
        summary,
        JSON.stringify(chartData),
        JSON.stringify(currentTemps),
        publishedAt
      ]
    );

    const newStory = {
      id,
      type: 'pulse',
      title,
      body,
      summary,
      chart_data: chartData,
      narrative_state: currentTemps,
      published_at: publishedAt
    };

    if (global.broadcastStory) {
      global.broadcastStory(newStory);
    }
    console.log('✅ Cinder Market Pulse story successfully published!');
  } catch (err) {
    console.error('❌ Failed to generate and publish Market Pulse story:', err);
  }
}

/**
 * Fetches 7d metrics, AI sentiment, and narrative state, invokes OpenAI, and publishes a Cinder Daily Deep Dive report.
 */
export async function generateAndPublishDailyDeepDive() {
  console.log('📰 Generating Cinder Daily Deep Dive story...');
  try {
    const btcHistorical = await query(
      `SELECT date, net_flow FROM etf_flows WHERE asset = 'BTC' ORDER BY date DESC LIMIT 7`
    );
    const ethHistorical = await query(
      `SELECT date, net_flow FROM etf_flows WHERE asset = 'ETH' ORDER BY date DESC LIMIT 7`
    );
    const etfFlowTrend = {
      btc: btcHistorical.map(h => ({ date: h.date, net_flow: h.net_flow })).reverse(),
      eth: ethHistorical.map(h => ({ date: h.date, net_flow: h.net_flow })).reverse()
    };

    const sectorRows = await query(`
      SELECT sd.sector, sd.performance_7d, sd.performance_30d, sd.correlation_btc
      FROM sector_data sd
      INNER JOIN (
          SELECT sector, MAX(fetched_at) as max_fetched
          FROM sector_data
          GROUP BY sector
      ) latest ON sd.sector = latest.sector AND sd.fetched_at = latest.max_fetched
    `);
    const sectorComparison = sectorRows.map(s => ({
      sector: s.sector,
      performance_7d: `${(s.performance_7d * 100).toFixed(2)}%`,
      performance_30d: `${(s.performance_30d * 100).toFixed(2)}%`,
      correlation_btc: s.correlation_btc
    }));

    const newsRows = await query(
      `SELECT title, sentiment FROM news_items WHERE fetched_at >= datetime('now', '-24 hours')`
    );
    const newsSentiment = newsRows.map(n => ({
      title: n.title,
      sentiment: n.sentiment
    }));

    const currentTemps = {};
    const latestTemps = await query(
      `SELECT nh.narrative_id, nh.temperature
       FROM narrative_history nh
       INNER JOIN (
         SELECT narrative_id, MAX(recorded_at) as max_recorded
         FROM narrative_history
         GROUP BY narrative_id
       ) latest ON nh.narrative_id = latest.narrative_id AND nh.recorded_at = latest.max_recorded`
    );
    for (const t of latestTemps) {
      currentTemps[t.narrative_id] = t.temperature;
    }

    const body = await generateDailyDeepDive({
      etfFlowTrend,
      sectorComparison,
      newsSentiment,
      narrativeState: currentTemps
    });

    let title = `Daily Deep Dive: Evaluating Capital Flows & Sector Rotations`;
    const lines = body.split('\n');
    const firstLine = lines[0]?.trim() || '';
    if (firstLine.startsWith('#')) {
      title = firstLine.replace(/^#+\s*/, '');
    }

    const id = `deep_${Date.now()}`;
    const publishedAt = new Date().toISOString();
    const summary = `A comprehensive daily report analyzing recent ETF flow trends, sector rotations, and current narrative temperatures.`;

    const chartData = {
      etf_flows: [
        ...etfFlowTrend.btc.map(b => ({ ...b, asset: 'BTC' })),
        ...etfFlowTrend.eth.map(e => ({ ...e, asset: 'ETH' }))
      ],
      sectors: sectorRows.map(s => ({
        sector: s.sector,
        performance_7d: parseFloat((s.performance_7d * 100).toFixed(2)),
        performance_30d: parseFloat((s.performance_30d * 100).toFixed(2)),
        correlation_btc: s.correlation_btc
      }))
    };

    await execute(
      `INSERT INTO stories (id, type, title, body, summary, chart_data, narrative_state, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        'deep_dive',
        title,
        body,
        summary,
        JSON.stringify(chartData),
        JSON.stringify(currentTemps),
        publishedAt
      ]
    );

    const newStory = {
      id,
      type: 'deep_dive',
      title,
      body,
      summary,
      chart_data: chartData,
      narrative_state: currentTemps,
      published_at: publishedAt
    };

    if (global.broadcastStory) {
      global.broadcastStory(newStory);
    }
    console.log('✅ Cinder Daily Deep Dive story successfully published!');
  } catch (err) {
    console.error('❌ Failed to generate and publish Daily Deep Dive story:', err);
  }
}

/**
 * Runs an initial sync to populate the database with real news feed data on boot.
 */
export async function runInitialSync() {
  console.log('🔄 Running initial sync to populate real news feed...');
  try {
    const news = await getAINewsFeed(50);
    if (news && news.length > 0) {
      await cacheNewsItems(news);
      console.log(`✅ Cached ${news.length} real news items in database`);
    }

    const btcFlows = await getETFFlows('BTC', 7);
    const ethFlows = await getETFFlows('ETH', 7);
    await cacheEtfFlows(btcFlows, 'BTC');
    await cacheEtfFlows(ethFlows, 'ETH');
    console.log('✅ Cached ETF flows in database');

    const sectors = await getSectorPerformance();
    await cacheSectors(sectors);
    console.log('✅ Cached sector performance in database');

    console.log('🌡️ Updating narrative temperatures...');
    const temps = await updateNarrativeTemperatures();
    console.log('🌡️ Current narrative temperatures:', temps);

    // Only generate first real stories if the stories table has no real scheduler stories
    const existingStories = await query(
      `SELECT COUNT(*) as count FROM stories WHERE id LIKE 'pulse_%' OR id LIKE 'deep_%'`
    );
    if (existingStories[0]?.count === 0) {
      console.log('📰 Generating first real Market Pulse & Daily Deep Dive stories from live data...');
      await generateAndPublishMarketPulse();
      await generateAndPublishDailyDeepDive();
    }
  } catch (err) {
    console.error('❌ Failed running initial sync:', err);
  }
}

// 1. Fetch AI news feed every hour (0 * * * *)
const hourlyNewsJob = cron.schedule('0 * * * *', async () => {
  console.log('⏰ Running hourly news fetch and narrative intelligence cycle...');
  try {
    const news = await getAINewsFeed(50);
    await cacheNewsItems(news);
    console.log(`📰 Fetched and cached news feed. Items: ${news ? news.length : 0}`);
    
    console.log('🌡️ Updating narrative temperatures...');
    const temps = await updateNarrativeTemperatures();
    console.log('🌡️ Current narrative temperatures:', temps);
    
    console.log('🚨 Running shift detection and trading check...');
    await checkMarketAndTrade();
  } catch (error) {
    console.error('❌ Error in hourly news and narrative cycle:', error);
  }
});

// 2. Fetch ETF flows every 4 hours (0 */4 * * *)
const etfFlowsJob = cron.schedule('0 */4 * * *', async () => {
  console.log('⏰ Running 4-hourly ETF flows fetch...');
  try {
    const btcFlows = await getETFFlows('BTC');
    const ethFlows = await getETFFlows('ETH');
    await cacheEtfFlows(btcFlows, 'BTC');
    await cacheEtfFlows(ethFlows, 'ETH');
    console.log(`📊 ETF flows fetched. BTC records: ${btcFlows ? btcFlows.length : 0}, ETH records: ${ethFlows ? ethFlows.length : 0}`);
  } catch (error) {
    console.error('❌ Error in ETF flows fetch job:', error);
  }
});

// 3. Fetch Sector performance every 4 hours (0 */4 * * *)
const sectorPerformanceJob = cron.schedule('0 */4 * * *', async () => {
  console.log('⏰ Running 4-hourly sector performance fetch...');
  try {
    const sectors = await getSectorPerformance();
    await cacheSectors(sectors);
    console.log(`🧬 Sector performance fetched. Records: ${sectors ? sectors.length : 0}`);
  } catch (error) {
    console.error('❌ Error in sector performance fetch job:', error);
  }
});

// 4. Generate Market Pulse every 4 hours (0 */4 * * *)
const marketPulseJob = cron.schedule('0 */4 * * *', async () => {
  console.log('⏰ Running 4-hourly Market Pulse generation trigger...');
  try {
    await generateAndPublishMarketPulse();
  } catch (error) {
    console.error('❌ Error in Market Pulse trigger job:', error);
  }
});

// 5. Generate Daily Deep Dive daily at 08:00 UTC (0 8 * * *)
const dailyDeepDiveJob = cron.schedule('0 8 * * *', async () => {
  console.log('⏰ Running daily Deep Dive generation trigger (08:00 UTC)...');
  try {
    await generateAndPublishDailyDeepDive();
  } catch (error) {
    console.error('❌ Error in Daily Deep Dive trigger job:', error);
  }
});

// 6. Monitor Stop Losses every 5 minutes (*/5 * * * *)
const stopLossMonitoringJob = cron.schedule('*/5 * * * *', async () => {
  console.log('⏰ Running 5-minute stop-loss monitoring job...');
  try {
    await executeStopLossMonitoring();
  } catch (error) {
    console.error('❌ Error in stop-loss monitoring job:', error);
  }
});

// Start all jobs
hourlyNewsJob.start();
etfFlowsJob.start();
sectorPerformanceJob.start();
marketPulseJob.start();
dailyDeepDiveJob.start();
stopLossMonitoringJob.start();

// Run the initial sync in the background
runInitialSync();

console.log('⏰ All cron schedules successfully started!');

const scheduler = {
  hourlyNewsJob,
  etfFlowsJob,
  sectorPerformanceJob,
  marketPulseJob,
  dailyDeepDiveJob,
  stopLossMonitoringJob,
  runInitialSync
};

export default scheduler;
