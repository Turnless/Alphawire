import { query, execute } from '../lib/db.js';

// Pre-defined narrative archetypes and their criteria matching ARCHITECTURE.md
export const NARRATIVES = {
  'NAR_01': {
    id: 'NAR_01',
    name: 'Institutional Accumulation',
    keywords: ['institutional', 'ETF', 'adoption'],
    expectedFlowPattern: 'inflow', // net inflows >= 200M/day
    expectedLeader: 'BTC',
    expectedSentiment: 'positive'
  },
  'NAR_02': {
    id: 'NAR_02',
    name: 'Retail FOMO',
    keywords: ['moon', 'breakout', 'all-time-high'],
    expectedFlowPattern: 'accelerating_inflow', // inflows accelerating rapidly
    expectedLeader: 'Meme',
    expectedSentiment: 'positive'
  },
  'NAR_03': {
    id: 'NAR_03',
    name: 'Regulatory Storm',
    keywords: ['regulation', 'SEC', 'ban', 'compliance'],
    expectedFlowPattern: 'outflow', // outflows begin or accelerate
    expectedLeader: 'Stablecoin',
    expectedSentiment: 'negative'
  },
  'NAR_04': {
    id: 'NAR_04',
    name: 'AI/Tech Rotation',
    keywords: ['AI', 'artificial intelligence', 'GPU'],
    expectedFlowPattern: 'decelerating', // BTC flows decelerating
    expectedLeader: 'AI',
    expectedSentiment: 'positive'
  },
  'NAR_05': {
    id: 'NAR_05',
    name: 'DeFi Renaissance',
    keywords: ['DeFi', 'yield', 'TVL', 'protocol'],
    expectedFlowPattern: 'neutral',
    expectedLeader: 'DeFi',
    expectedSentiment: 'positive'
  },
  'NAR_06': {
    id: 'NAR_06',
    name: 'Risk-Off Flight',
    keywords: ['crash', 'recession', 'risk', 'macro'],
    expectedFlowPattern: 'large_outflow',
    expectedLeader: 'Stablecoin',
    expectedSentiment: 'negative'
  },
  'NAR_07': {
    id: 'NAR_07',
    name: 'L2/Infra Cycle',
    keywords: ['scaling', 'Layer 2', 'rollup', 'infra'],
    expectedFlowPattern: 'neutral_positive',
    expectedLeader: 'L2',
    expectedSentiment: 'positive'
  },
  'NAR_08': {
    id: 'NAR_08',
    name: 'Black Swan',
    keywords: ['anomaly', 'hack', 'exploit', 'panic', 'collapse', 'halt', 'liquidated', 'insolvent', 'emergency'],
    expectedFlowPattern: 'extreme_outflow', // extreme outflows
    expectedLeader: 'Stablecoin',
    expectedSentiment: 'negative'
  }
};

/**
 * Calculates the current temperature (0-100) of a specific narrative.
 * Combines news score, ETF flow score, and sector performance score.
 * @param {string} narrativeId - e.g., 'NAR_01'
 * @param {Object} [history] - Access to historical database readings (optional)
 * @returns {Promise<Object>} Object containing total temperature and sub-scores
 */
export async function calculateNarrativeTemperature(narrativeId, history) {
  const narrative = NARRATIVES[narrativeId];
  if (!narrative) {
    throw new Error(`Narrative archetype not found: ${narrativeId}`);
  }

  // --- 1. NewsScore Calculation (40% weight) ---
  let newsScore = 50.0;
  try {
    const news24h = await query(
      "SELECT title, summary, keywords, sentiment, fetched_at FROM news_items WHERE fetched_at >= datetime('now', '-24 hours')"
    );
    const news30d = await query(
      "SELECT title, summary, keywords, sentiment, fetched_at FROM news_items WHERE fetched_at >= datetime('now', '-30 days')"
    );

    let keywords_present = 0;
    let matchingNewsSentimentSum = 0;
    let matchingNewsCount = 0;

    for (const item of news24h) {
      let itemKeywords = [];
      try {
        itemKeywords = typeof item.keywords === 'string' ? JSON.parse(item.keywords) : (item.keywords || []);
      } catch (e) {}
      const textToSearch = `${item.title} ${item.summary || ''}`.toLowerCase();
      const matches = narrative.keywords.some(kw => 
        itemKeywords.some(k => k.toLowerCase() === kw.toLowerCase()) || 
        textToSearch.includes(kw.toLowerCase())
      );
      if (matches) {
        keywords_present++;
        matchingNewsSentimentSum += (item.sentiment !== null && item.sentiment !== undefined) ? item.sentiment : 0;
        matchingNewsCount++;
      }
    }

    let total_keywords_30d = 0;
    for (const item of news30d) {
      let itemKeywords = [];
      try {
        itemKeywords = typeof item.keywords === 'string' ? JSON.parse(item.keywords) : (item.keywords || []);
      } catch (e) {}
      const textToSearch = `${item.title} ${item.summary || ''}`.toLowerCase();
      const matches = narrative.keywords.some(kw => 
        itemKeywords.some(k => k.toLowerCase() === kw.toLowerCase()) || 
        textToSearch.includes(kw.toLowerCase())
      );
      if (matches) {
        total_keywords_30d++;
      }
    }

    let daysDifference = 30;
    if (news30d.length > 0) {
      const oldest = news30d[news30d.length - 1];
      const newest = news30d[0];
      if (oldest && newest) {
        const ms = new Date(newest.fetched_at) - new Date(oldest.fetched_at);
        daysDifference = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
      }
    }

    const keywords_baseline = Math.max(1, total_keywords_30d / daysDifference);
    const keyword_ratio = keywords_present / keywords_baseline;

    const averageSentiment = matchingNewsCount > 0 ? (matchingNewsSentimentSum / matchingNewsCount) : 0;
    let sentiment_alignment = 0.0;
    if (narrative.expectedSentiment === 'positive') {
      sentiment_alignment = averageSentiment > 0.0 ? 1.0 : 0.0;
    } else if (narrative.expectedSentiment === 'negative') {
      sentiment_alignment = averageSentiment < 0.0 ? 1.0 : 0.0;
    } else {
      sentiment_alignment = Math.abs(averageSentiment) <= 0.1 ? 1.0 : 0.0;
    }

    newsScore = Math.min(100, keyword_ratio * 50 * sentiment_alignment);
  } catch (err) {
    console.error(`Failed calculating NewsScore for ${narrativeId}:`, err);
  }

  // --- 2. FlowScore Calculation (35% weight) ---
  let flowScore = 50.0;
  try {
    const btcFlowsRows = await query(
      "SELECT net_flow FROM etf_flows WHERE asset = 'BTC' ORDER BY date DESC LIMIT 7"
    );
    const F = btcFlowsRows.map(row => row.net_flow).reverse(); // oldest to newest

    if (F.length > 0) {
      const avgFlow = F.reduce((sum, val) => sum + val, 0) / F.length;
      const pattern = narrative.expectedFlowPattern;

      if (pattern === 'inflow') {
        if (avgFlow >= 200_000_000) {
          flowScore = 100;
        } else if (avgFlow > 0) {
          flowScore = (avgFlow / 200_000_000) * 100;
        } else {
          flowScore = 0;
        }
      } else if (pattern === 'accelerating_inflow') {
        if (F.length >= 4) {
          const half = Math.floor(F.length / 2);
          const recent = F.slice(-half);
          const older = F.slice(0, half);
          const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
          const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
          const diff = avgRecent - avgOlder;
          if (avgRecent > 0 && diff > 0) {
            flowScore = Math.min(100, (diff / 100_000_000) * 100);
          } else {
            flowScore = 0;
          }
        } else {
          flowScore = avgFlow > 0 ? 60 : 30;
        }
      } else if (pattern === 'outflow') {
        flowScore = avgFlow < 0 ? Math.min(100, (Math.abs(avgFlow) / 100_000_000) * 100) : 0;
      } else if (pattern === 'decelerating') {
        if (F.length >= 4) {
          const half = Math.floor(F.length / 2);
          const recent = F.slice(-half);
          const older = F.slice(0, half);
          const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
          const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
          const diff = avgRecent - avgOlder;
          if (diff < 0) {
            flowScore = Math.min(100, (Math.abs(diff) / 100_000_000) * 100);
          } else {
            flowScore = 0;
          }
        } else {
          flowScore = avgFlow < 0 ? 80 : 30;
        }
      } else if (pattern === 'neutral') {
        const avgAbsFlow = F.reduce((sum, val) => sum + Math.abs(val), 0) / F.length;
        flowScore = Math.max(0, 100 - (avgAbsFlow / 50_000_000) * 100);
      } else if (pattern === 'large_outflow') {
        if (avgFlow < -100_000_000) {
          flowScore = 100;
        } else if (avgFlow < 0) {
          flowScore = (Math.abs(avgFlow) / 100_000_000) * 100;
        } else {
          flowScore = 0;
        }
      } else if (pattern === 'neutral_positive') {
        if (avgFlow >= 0) {
          flowScore = Math.min(100, 50 + (avgFlow / 100_000_000) * 50);
        } else {
          flowScore = Math.max(0, 50 - (Math.abs(avgFlow) / 100_000_000) * 50);
        }
      } else if (pattern === 'extreme_outflow') {
        flowScore = avgFlow < 0 ? Math.min(100, (Math.abs(avgFlow) / 200_000_000) * 100) : 0;
      }
    }
  } catch (err) {
    console.error(`Failed calculating FlowScore for ${narrativeId}:`, err);
  }

  // --- 3. SectorScore Calculation (25% weight) ---
  let sectorScore = 50.0;
  try {
    const sectorRows = await query(`
      SELECT sd.sector, sd.performance_7d, sd.performance_30d, sd.correlation_btc
      FROM sector_data sd
      INNER JOIN (
          SELECT sector, MAX(fetched_at) as max_fetched
          FROM sector_data
          GROUP BY sector
      ) latest ON sd.sector = latest.sector AND sd.fetched_at = latest.max_fetched
      ORDER BY sd.performance_7d DESC;
    `);

    if (sectorRows.length > 0) {
      const leader = sectorRows[0];
      const expectedLeader = narrative.expectedLeader;

      const isMatch = (sectorName, expected) => {
        const s = sectorName.toLowerCase().replace('.ssi', '').trim();
        const e = expected.toLowerCase().replace('.ssi', '').trim();
        return s.includes(e) || e.includes(s);
      };

      if (isMatch(leader.sector, expectedLeader)) {
        const leaderReturn = leader.performance_7d || 0;
        const runnerUpReturn = sectorRows.length > 1 ? (sectorRows[1].performance_7d || 0) : 0;
        const outperformance = (leaderReturn - runnerUpReturn) * 100;
        sectorScore = Math.min(100, 80 + (outperformance * 4));
      } else {
        const rank = sectorRows.findIndex(row => isMatch(row.sector, expectedLeader));
        if (rank !== -1) {
          sectorScore = Math.max(0, 50 - (rank * 15));
        } else {
          sectorScore = 0;
        }
      }
    }
  } catch (err) {
    console.error(`Failed calculating SectorScore for ${narrativeId}:`, err);
  }

  const temperature = (0.40 * newsScore) + (0.35 * flowScore) + (0.25 * sectorScore);

  return {
    temperature: Math.round(temperature * 100) / 100,
    newsScore: Math.round(newsScore * 100) / 100,
    flowScore: Math.round(flowScore * 100) / 100,
    sectorScore: Math.round(sectorScore * 100) / 100
  };
}

/**
 * Identifies the dominant narrative archetype over a lookback window.
 * @param {Object} [history] - Access to historical database readings (optional)
 * @param {number} [lookbackHours=168] - Hours to look back (default: 7 days)
 * @returns {Promise<Object>} The dominant narrative archetype record
 */
export async function getDominantNarrative(history, lookbackHours = 168) {
  try {
    const rows = await query(`
      SELECT narrative_id, AVG(temperature) as avg_temp
      FROM narrative_history
      WHERE recorded_at >= datetime('now', ?)
      GROUP BY narrative_id
      ORDER BY avg_temp DESC
    `, [`-${lookbackHours} hours`]);

    if (rows.length === 0) {
      return {
        id: 'NAR_01',
        name: NARRATIVES['NAR_01'].name,
        temperature: 50.0
      };
    }

    const dominantId = rows[0].narrative_id;
    const avgTemp = rows[0].avg_temp;

    return {
      id: dominantId,
      name: NARRATIVES[dominantId]?.name || 'Unknown Narrative',
      temperature: Math.round(avgTemp * 100) / 100
    };
  } catch (err) {
    console.error('Failed to get dominant narrative:', err);
    return {
      id: 'NAR_01',
      name: NARRATIVES['NAR_01'].name,
      temperature: 50.0
    };
  }
}

/**
 * Triggers the hourly temperature update cycle for all narrative archetypes.
 * Stores results in the database.
 * @returns {Promise<Object>} Map of all narrative IDs to their new temperatures
 */
export async function updateNarrativeTemperatures() {
  const result = {};
  const recordedAt = new Date().toISOString();

  for (const narrativeId of Object.keys(NARRATIVES)) {
    const scores = await calculateNarrativeTemperature(narrativeId);
    
    await execute(
      `INSERT INTO narrative_history (narrative_id, temperature, news_score, flow_score, sector_score, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        narrativeId,
        scores.temperature,
        scores.newsScore,
        scores.flowScore,
        scores.sectorScore,
        recordedAt
      ]
    );

    result[narrativeId] = scores.temperature;
  }

  return result;
}

