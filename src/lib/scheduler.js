import cron from 'node-cron';
import { getETFFlows, getAINewsFeed, getSectorPerformance } from './sosovalue.js';
import { updateNarrativeTemperatures } from '../engine/narrative.js';
import { checkMarketAndTrade, executeStopLossMonitoring } from '../engine/trade-engine.js';

console.log('⏰ Initializing AlphaWire Scheduler...');

// 1. Fetch AI news feed every hour (0 * * * *)
// This runs the hourly intelligence cycle: fetch-news -> update-narratives -> check-shifts -> checkMarketAndTrade
const hourlyNewsJob = cron.schedule('0 * * * *', async () => {
  console.log('⏰ Running hourly news fetch and narrative intelligence cycle...');
  try {
    // Fetch news (under the hood, this will fetch and cache in news_items)
    const news = await getAINewsFeed(50);
    console.log(`📰 Fetched news feed. Items: ${news ? news.length : 0}`);
    
    // Update narrative temperatures
    console.log('🌡️ Updating narrative temperatures...');
    const temps = await updateNarrativeTemperatures();
    console.log('🌡️ Current narrative temperatures:', temps);
    
    // Detect shift and trigger trade execution
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
    console.log(`🧬 Sector performance fetched. Records: ${sectors ? sectors.length : 0}`);
  } catch (error) {
    console.error('❌ Error in sector performance fetch job:', error);
  }
});

// 4. Generate Market Pulse every 4 hours (0 */4 * * *)
const marketPulseJob = cron.schedule('0 */4 * * *', async () => {
  console.log('⏰ Running 4-hourly Market Pulse generation trigger...');
  try {
    // Pulse story generation is triggered through API routes or dedicated service handlers
  } catch (error) {
    console.error('❌ Error in Market Pulse trigger job:', error);
  }
});

// 5. Generate Daily Deep Dive daily at 08:00 UTC (0 8 * * *)
const dailyDeepDiveJob = cron.schedule('0 8 * * *', async () => {
  console.log('⏰ Running daily Deep Dive generation trigger (08:00 UTC)...');
  try {
    // Deep dive story generation is triggered through API routes or dedicated service handlers
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

console.log('⏰ All cron schedules successfully started!');

const scheduler = {
  hourlyNewsJob,
  etfFlowsJob,
  sectorPerformanceJob,
  marketPulseJob,
  dailyDeepDiveJob,
  stopLossMonitoringJob
};

export default scheduler;
