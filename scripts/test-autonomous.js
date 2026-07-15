import { checkMarketAndTrade, executeStopLossMonitoring } from '../src/engine/trade-engine.js';
import { execute } from '../src/lib/db.js';

async function runAutonomousAgentTest() {
  console.log('====================================================');
  console.log('🚀 STARTING CINDER AUTONOMOUS TRADING AGENT LIVE TEST (NO CLEANUP)');
  console.log('====================================================');

  // Backup current AUTO_TRADE_ENABLED state
  const prevAutoTrade = process.env.AUTO_TRADE_ENABLED;
  process.env.AUTO_TRADE_ENABLED = 'true'; // Force enable for test runtime

  try {
    console.log('\n[STEP 1] Seeding mock market flow/news data for detection...');
    const seedId = Date.now();
    
    // Seed some flow data to trigger a narrative shift (e.g. BTC flow increase)
    await execute(`
      INSERT INTO etf_flows (id, asset, date, net_flow, total_net_assets, details, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, ['flow_test_' + seedId, 'BTC', '2026-07-15', 950.50, 15000.00, '{}']);

    await execute(`
      INSERT INTO news_items (id, title, summary, source, keywords, sentiment, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      'news_test_' + seedId,
      'Breaking: Institutional Demand Triggers Major Capital Rotation into BTC and ETH',
      'Large asset managers report record-breaking inflows into cryptocurrency exchange-traded products, indicating a major shift towards institutional accumulation.',
      'Test Feed',
      '["BTC", "inflows", "institutions"]',
      0.85
    ]);

    console.log('[SUCCESS] Mock news and flows successfully seeded!');

    console.log('\n[STEP 2] Seeding a test open trade into DB for stop-loss monitoring...');
    const testTradeId = 'tr_test_' + seedId;
    await execute(`
      INSERT INTO trades (id, side, pair, order_type, quantity, fill_price, stop_loss_price, sodex_order_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      testTradeId,
      'buy',
      'BTC-USDC',
      'market',
      '0.050000',
      '64850.00',
      '59662.00', // ~8% below entry
      'ord_test_' + seedId,
      'filled'
    ]);
    console.log(`[SUCCESS] Seeded test trade ID: ${testTradeId} in 'filled' status.`);

    console.log('\n[STEP 3] Running checkMarketAndTrade Core Loop...');
    console.log('Analyzing narrative shift parameters, checking risk gates, and executing mock orders:');
    await checkMarketAndTrade();

    console.log('\n[STEP 4] Running Stop-Loss and Trailing profit Monitor...');
    console.log('Checking active database trades against stop-loss thresholds and trailing target prices:');
    await executeStopLossMonitoring();

    console.log('\n[SUCCESS] Script finished. Seeding records remain in DB for your inspection.');

  } catch (error) {
    console.error('\n❌ Test execution failed with error:', error);
  } finally {
    process.env.AUTO_TRADE_ENABLED = prevAutoTrade;
    console.log('\n====================================================');
    console.log('🏁 AUTONOMOUS AGENT TEST CYCLE COMPLETED!');
    console.log('====================================================');
  }
}

runAutonomousAgentTest();
