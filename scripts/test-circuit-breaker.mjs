/**
 * Dedicated test script for the daily loss Circuit Breaker.
 * Simulates portfolio value and database logs of recently closed stopped trades,
 * and asserts that runPreTradeChecks accurately halts trading.
 */

import { runPreTradeChecks } from '../src/engine/trade-engine.js';
import { execute, query } from '../src/lib/db.js';

// Mock setup environment
process.env.AUTO_TRADE_ENABLED = 'true';
process.env.USER_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.SODEX_API_KEY_NAME = 'test_api_key';

async function runTest() {
  console.log('🧪 Starting Circuit Breaker gate verification test...');

  try {
    // 1. Clear trades table
    await execute("DELETE FROM trades");

    // 2. Mock a scenario with no trades: checks should pass
    const shift = { from_narrative: 'NAR_01', to_narrative: 'NAR_04', confidence: 90, signals: '[]' };
    const mockAccountState = {
      balances: [
        { asset: 'USDC', amount: '10000.00' }
      ]
    };

    console.log('📋 Scenario 1: Fresh account, zero daily losses.');
    let result = await runPreTradeChecks(shift, mockAccountState);
    console.log('   Pass Status:', result.passed);
    console.log('   Failed Gates:', result.failedGates);
    if (!result.passed) {
      throw new Error('Verification failed: Scenario 1 should pass.');
    }

    // 3. Mock a scenario with trades within 24 hours that incurred total losses >15%
    // Let's insert a trade that resulted in a loss of $2,000 (Drawdown of 16.67% on a $10,000 portfolio)
    console.log('📋 Scenario 2: Adding a stopped trade with a $2,000 loss (16.67% drawdown)...');
    
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    // We insert a closed stopped trade using ISO strings
    await execute(`
      INSERT INTO trades (id, side, pair, order_type, quantity, fill_price, stop_loss_price, status, created_at, closed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'trade_mock_001',
      'buy',
      'BTC-USDC',
      'market',
      '10.0', // Qty
      '1000.00', // Fill price ($10,000 cost)
      '800.00', // Exit price ($8,000 value) -> Loss of $2,000
      'stopped',
      twoHoursAgo,
      oneHourAgo
    ]);

    result = await runPreTradeChecks(shift, mockAccountState);
    console.log('   Pass Status:', result.passed);
    console.log('   Failed Gates:', result.failedGates);
    if (result.passed || !result.failedGates.includes('DAILY_LOSS_LIMIT_EXCEEDED')) {
      throw new Error('Verification failed: Scenario 2 should fail with DAILY_LOSS_LIMIT_EXCEEDED.');
    }
    console.log('✅ Daily loss limit circuit breaker blocked the trade correctly!');

    // 4. Mock a trade from 48 hours ago (outside the 24h window)
    console.log('📋 Scenario 3: Shifting the loss to 48 hours ago (outside 24h window)...');
    await execute("DELETE FROM trades");
    
    const fortyNineHoursAgo = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    await execute(`
      INSERT INTO trades (id, side, pair, order_type, quantity, fill_price, stop_loss_price, status, created_at, closed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'trade_mock_002',
      'buy',
      'BTC-USDC',
      'market',
      '10.0',
      '1000.00',
      '800.00',
      'stopped',
      fortyNineHoursAgo,
      fortyEightHoursAgo
    ]);

    result = await runPreTradeChecks(shift, mockAccountState);
    console.log('   Pass Status:', result.passed);
    console.log('   Failed Gates:', result.failedGates);
    if (!result.passed) {
      throw new Error('Verification failed: Scenario 3 should pass as drawdown is >24 hours old.');
    }
    console.log('✅ Cooldown window checks passed and ignored historical losses successfully!');
    
    // Clear mock trades
    await execute("DELETE FROM trades");
    console.log('🎉 Circuit Breaker logic successfully verified!');
  } catch (err) {
    console.error('❌ Test runner encountered an error:', err);
    process.exit(1);
  }
}

runTest();
