/**
 * AlphaWire Trade Execution Engine.
 * Fully implemented risk checks, portfolio sizing, order execution, and stop-loss monitoring.
 */

import crypto from 'crypto';
import { query, execute } from '../lib/db.js';
import { NARRATIVES, updateNarrativeTemperatures } from './narrative.js';
import { detectShift } from './shift-detector.js';
import { placeOrder, getTicker, fetchAccountBalances, getAccountState } from '../lib/sodex.js';
import { createBreakingStory } from '../lib/openai.js';

/**
 * Helper to parse datetime strings from SQLite correctly as UTC.
 * @param {string} str - Datetime string
 * @returns {number} Epoch milliseconds
 */
function parseSqliteDatetime(str) {
  if (!str) return 0;
  const formatted = (str.endsWith('Z') || str.includes('+') || str.includes('-')) 
    ? str 
    : str.replace(' ', 'T') + 'Z';
  return new Date(formatted).getTime();
}

/**
 * Helper to check if the Vercel Edge Config kill-switch is active.
 * @returns {Promise<boolean>} True if trading is paused/kill-switch active
 */
async function isKillSwitchActive() {
  if (global.tradingPaused === true) {
    return true;
  }
  const edgeConfigUrl = process.env.EDGE_CONFIG_URL || process.env.EDGE_CONFIG;
  if (!edgeConfigUrl) {
    return false; // Default to false if not configured
  }
  try {
    let fetchUrl = edgeConfigUrl;
    if (edgeConfigUrl.includes('?')) {
      const [base, queryStr] = edgeConfigUrl.split('?');
      fetchUrl = `${base}/value/trading_paused?${queryStr}`;
    } else {
      fetchUrl = `${edgeConfigUrl}/value/trading_paused`;
    }

    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const isPaused = await res.json();
      return isPaused === true || isPaused === 'true';
    }
  } catch (err) {
    console.error('Failed to fetch Edge Config kill-switch:', err);
  }
  return false;
}

/**
 * Calculates total portfolio value in USD based on live prices from SoDEX.
 * @param {string} userAddress - Wallet address
 * @returns {Promise<number>} Portfolio value in USD
 */
async function calculatePortfolioValue(userAddress) {
  const privateKey = process.env.SODEX_API_KEY_PRIVATE_KEY;
  const isMockMode = !privateKey || 
                     privateKey === 'your_api_key_private_key_returned_from_addAPIKey' ||
                     !userAddress ||
                     userAddress === 'your_evm_wallet_address_0x...';
  if (isMockMode) {
    return 10000.00;
  }
  try {
    const balances = await fetchAccountBalances(userAddress);
    let totalValue = 0;
    for (const bal of balances) {
      const free = parseFloat(bal.free || '0');
      const locked = parseFloat(bal.locked || '0');
      const totalAmt = free + locked;
      if (totalAmt <= 0) continue;

      if (bal.asset === 'USDC') {
        totalValue += totalAmt;
      } else {
        try {
          const ticker = await getTicker(`${bal.asset}-USDC`);
          const price = parseFloat(ticker.price || '0');
          totalValue += totalAmt * price;
        } catch (err) {
          console.error(`Failed to fetch price for asset ${bal.asset}:`, err);
        }
      }
    }
    return totalValue;
  } catch (err) {
    console.error('Failed to calculate portfolio value:', err);
    return 0;
  }
}

/**
 * Initiates the hourly market evaluation and trading cycle.
 * Fetches data, scores narrative regimes, detects shifts, runs risk gates, and executes orders.
 * @returns {Promise<void>}
 */
export async function checkMarketAndTrade() {
  console.log('🔄 Initiating hourly market evaluation cycle...');

  // 1. Recalculate temperatures and save them to narrative_history
  const temps = await updateNarrativeTemperatures();

  // 2. Run shift detection
  const shift = await detectShift(temps);
  if (!shift) {
    console.log('✅ Market is stable. No narrative shift detected.');
    return;
  }

  const fromName = NARRATIVES[shift.from_narrative]?.name || shift.from_narrative;
  const toName = NARRATIVES[shift.to_narrative]?.name || shift.to_narrative;
  console.log(`🚨 ALERT: Narrative shift detected! From [${fromName}] to [${toName}]`);

  // Target token mapping based on narrative archetypes
  const NARRATIVE_TARGET_TOKENS = {
    'NAR_01': 'BTC',
    'NAR_02': 'DOGE',
    'NAR_03': 'USDC',
    'NAR_04': 'FET',
    'NAR_05': 'UNI',
    'NAR_06': 'USDC',
    'NAR_07': 'OP',
    'NAR_08': 'USDC'
  };

  const targetToken = NARRATIVE_TARGET_TOKENS[shift.to_narrative] || 'BTC';
  if (targetToken === 'USDC') {
    console.log(`Market rotated to a defensive stablecoin narrative (${toName}). No buy order triggered.`);
    return;
  }

  // 3. Fetch user wallet address and state from SoDEX
  const userAddress = process.env.USER_WALLET_ADDRESS;
  if (!userAddress) {
    console.log('❌ Trading halted: USER_WALLET_ADDRESS environment variable is not defined.');
    return;
  }

  let accountState;
  try {
    accountState = await getAccountState(userAddress);
  } catch (err) {
    console.error('❌ Failed to fetch SoDEX account state:', err);
    return;
  }

  // 4. Run pre-trade risk gates
  const precheck = await runPreTradeChecks(shift, accountState);

  const storyId = crypto.randomUUID();
  const shiftId = crypto.randomUUID();
  const tradeId = crypto.randomUUID();

  if (!precheck.passed) {
    console.log(`❌ Trading checks failed: ${precheck.failedGates.join(', ')}. Story will be published without trade.`);

    // Generate and publish shift story only
    let storyBody = '';
    try {
      storyBody = await createBreakingStory({
        shiftData: {
          previousNarrative: fromName,
          dominantNarrative: toName,
          confidence: shift.confidence,
          signals: JSON.parse(shift.signals)
        },
        tradeData: {
          side: 'BUY',
          pair: `${targetToken}-USDC`,
          quantity: '0.00',
          price: '0.00',
          status: `SKIPPED (${precheck.failedGates.join(', ')})`,
          orderId: 'N/A'
        },
        publishedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to generate breaking story via LLM:', err);
      storyBody = `Narrative shifted from ${fromName} to ${toName}. Trade was skipped due to risk gates: ${precheck.failedGates.join(', ')}.`;
    }

    // Insert story into database
    await execute(
      `INSERT INTO stories (id, type, title, body, summary, narrative_state, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        storyId,
        'breaking',
        `BREAKING: Regime Shift to ${toName}`,
        storyBody,
        `Market narrative has shifted from ${fromName} to ${toName}.`,
        JSON.stringify(temps),
        new Date().toISOString()
      ]
    );

    // Insert narrative shift record
    await execute(
      `INSERT INTO narrative_shifts (id, from_narrative, to_narrative, confidence, signals, story_id, trade_id, detected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shiftId,
        shift.from_narrative,
        shift.to_narrative,
        shift.confidence,
        shift.signals,
        storyId,
        null,
        new Date().toISOString()
      ]
    );
    return;
  }

  // 5. Compute position size
  const portfolioValue = await calculatePortfolioValue(userAddress);
  const usdcBal = parseFloat(accountState.balances.find(b => b.asset === 'USDC')?.free || '0');
  const sizeUSD = calculatePositionSize(portfolioValue, usdcBal);

  if (sizeUSD < 10) {
    console.log(`❌ Insufficient USDC balance on SoDEX for minimum trade ($${sizeUSD.toFixed(2)} < $10).`);
    return;
  }

  // Get current market price of target token
  let price = 0;
  try {
    const ticker = await getTicker(`${targetToken}-USDC`);
    price = parseFloat(ticker.price || '0');
  } catch (err) {
    console.error(`❌ Failed to fetch ticker for ${targetToken}-USDC:`, err);
    return;
  }

  if (price <= 0) {
    console.error(`❌ Invalid price for ${targetToken}-USDC: ${price}`);
    return;
  }

  const targetQty = (sizeUSD / price).toFixed(4);
  console.log(`⚡ Executing trade: Buy ${targetQty} ${targetToken} on SoDEX (approx. $${sizeUSD.toFixed(2)})`);

  // Execute buy order on SoDEX
  let orderResult;
  try {
    orderResult = await placeOrder({
      pair: `${targetToken}-USDC`,
      side: 'BUY',
      orderType: 'MARKET',
      quantity: targetQty,
      price: '0.00'
    });
  } catch (err) {
    console.error('❌ SoDEX order placement failed:', err);
    return;
  }

  if (orderResult && orderResult.status === 'FILLED') {
    const fillPrice = parseFloat(orderResult.price || price);
    const stopLossPrice = (fillPrice * (1 - 0.08)).toFixed(4);

    console.log(`✅ Trade filled successfully! Order ID: ${orderResult.orderId}`);

    // Save story to database
    let storyBody = '';
    try {
      storyBody = await createBreakingStory({
        shiftData: {
          previousNarrative: fromName,
          dominantNarrative: toName,
          confidence: shift.confidence,
          signals: JSON.parse(shift.signals)
        },
        tradeData: {
          side: 'BUY',
          pair: `${targetToken}-USDC`,
          quantity: targetQty,
          price: fillPrice.toString(),
          status: 'FILLED',
          orderId: orderResult.orderId
        },
        publishedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to generate breaking story via LLM:', err);
      storyBody = `Narrative shifted from ${fromName} to ${toName}. Executed BUY of ${targetQty} ${targetToken} at ${fillPrice}.`;
    }

    // Insert story
    await execute(
      `INSERT INTO stories (id, type, title, body, summary, narrative_state, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        storyId,
        'breaking',
        `BREAKING: Regime Shift to ${toName}`,
        storyBody,
        `Market narrative has shifted from ${fromName} to ${toName}.`,
        JSON.stringify(temps),
        new Date().toISOString()
      ]
    );

    // Insert trade
    await execute(
      `INSERT INTO trades (id, shift_id, story_id, side, pair, order_type, quantity, fill_price, stop_loss_price, sodex_order_id, status, created_at, filled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tradeId,
        shiftId,
        storyId,
        'buy',
        `${targetToken}-USDC`,
        'market',
        targetQty,
        fillPrice.toString(),
        stopLossPrice,
        orderResult.orderId,
        'filled',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    // Insert narrative shift
    await execute(
      `INSERT INTO narrative_shifts (id, from_narrative, to_narrative, confidence, signals, story_id, trade_id, detected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shiftId,
        shift.from_narrative,
        shift.to_narrative,
        shift.confidence,
        shift.signals,
        storyId,
        tradeId,
        new Date().toISOString()
      ]
    );

    console.log(`📰 Breaking story published to wire. Story ID: ${storyId}`);
  } else {
    console.log(`❌ Order placement failed or remained pending. Status: ${orderResult?.status || 'UNKNOWN'}`);
  }
}

/**
 * Evaluates the 5 pre-trade risk gates (cooldown, daily loss, max positions, kill-switch, etc.).
 * @param {Object} shiftData - The detected narrative shift information
 * @param {Object} accountState - Balances and current positions from SoDEX
 * @returns {Promise<Object>} Object with a boolean `passed` and a list of `failedGates`
 */
export async function runPreTradeChecks(shiftData, accountState) {
  const failedGates = [];

  // 1. Auto-trading state gate
  const autoTradeEnabled = process.env.AUTO_TRADE_ENABLED === 'true';
  if (!autoTradeEnabled) {
    failedGates.push('AUTO_TRADE_DISABLED');
  }

  // 2. Cooldown period check (48 hours between narrative trades)
  try {
    const lastTrades = await query('SELECT created_at FROM trades ORDER BY created_at DESC LIMIT 1');
    if (lastTrades && lastTrades.length > 0) {
      const lastTradeTime = parseSqliteDatetime(lastTrades[0].created_at);
      const diffMs = Date.now() - lastTradeTime;
      const cooldownHours = Number(process.env.COOLDOWN_HOURS) || 48;
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      if (diffMs < cooldownMs) {
        failedGates.push('COOLDOWN_ACTIVE');
      }
    }
  } catch (err) {
    console.error('Error during cooldown pre-trade check:', err);
  }

  // 3. Max open positions gate (limit to 5)
  try {
    const openTrades = await query("SELECT COUNT(*) as count FROM trades WHERE status = 'filled'");
    const openCount = openTrades[0]?.count || 0;
    if (openCount >= 5) {
      failedGates.push('MAX_POSITIONS_REACHED');
    }
  } catch (err) {
    console.error('Error checking open positions count:', err);
  }

  // 4. Circuit Breaker: 15% daily loss limit check
  try {
    const oneDayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentClosedTrades = await query(
      `SELECT * FROM trades 
       WHERE (status = 'stopped' OR status = 'closed')
         AND closed_at >= ?`,
      [oneDayAgoIso]
    );

    let totalLoss = 0;
    for (const t of recentClosedTrades) {
      const fill = parseFloat(t.fill_price || '0');
      const exit = parseFloat(t.stop_loss_price || t.fill_price || '0');
      const qty = parseFloat(t.quantity || '0');
      const pnl = (exit - fill) * qty; // assuming BUY entry
      if (pnl < 0) {
        totalLoss += Math.abs(pnl);
      }
    }

    const userAddress = process.env.USER_WALLET_ADDRESS;
    if (userAddress) {
      const portfolioValue = await calculatePortfolioValue(userAddress);
      if (portfolioValue > 0) {
        const lossRatio = totalLoss / (portfolioValue + totalLoss);
        if (lossRatio > 0.15) {
          failedGates.push('DAILY_LOSS_LIMIT_EXCEEDED');
        }
      }
    }
  } catch (err) {
    console.error('Error checking daily loss circuit breaker:', err);
  }

  // 5. Edge Config-based kill-switch
  const killSwitch = await isKillSwitchActive();
  if (killSwitch) {
    failedGates.push('KILL_SWITCH_ACTIVE');
  }

  // 6. Environment separation safety gate
  const isStaging = process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development' || process.env.NODE_ENV !== 'production';
  const isMainnetEndpoint = (process.env.SODEX_API_BASE_URL || '').includes('mainnet');
  if (isStaging && isMainnetEndpoint) {
    failedGates.push('STAGING_ENVIRONMENT_MAINNET_URL_BLOCKED');
  }

  return {
    passed: failedGates.length === 0,
    failedGates
  };
}

/**
 * Calculates risk-adjusted trade position sizes based on capital limits and available balances.
 * @param {number} portfolioValue - Total portfolio value in USD
 * @param {number} availableBalance - Spendable USD balance
 * @returns {number} Sized trade amount in USD
 */
export function calculatePositionSize(portfolioValue, availableBalance) {
  const maxAlloc = parseFloat(process.env.MAX_ALLOCATION_PER_TRADE || '0.30');
  const targetSize = portfolioValue * maxAlloc;
  return Math.max(0, Math.min(targetSize, availableBalance));
}

/**
 * Monitors active positions on SoDEX and executes stop-losses or profit-taking.
 * Runs on a 5-minute interval.
 * @returns {Promise<void>}
 */
export async function executeStopLossMonitoring() {
  try {
    const openTrades = await query("SELECT * FROM trades WHERE status = 'filled'");
    if (openTrades.length === 0) return;

    const stopLossPercent = parseFloat(process.env.STOP_LOSS_PERCENTAGE || '0.08');

    for (const trade of openTrades) {
      try {
        const ticker = await getTicker(trade.pair);
        const currentPrice = parseFloat(ticker.price || '0');
        if (currentPrice <= 0) continue;

        // Trailing stop loss calculation and DB update
        const calculatedStopLoss = currentPrice * (1 - stopLossPercent);
        const currentStopLoss = parseFloat(trade.stop_loss_price || '0');

        if (calculatedStopLoss > currentStopLoss) {
          await execute(
            'UPDATE trades SET stop_loss_price = ? WHERE id = ?',
            [calculatedStopLoss.toFixed(4), trade.id]
          );
          trade.stop_loss_price = calculatedStopLoss.toFixed(4);
        }

        // Trigger condition check
        if (currentPrice <= parseFloat(trade.stop_loss_price || '0')) {
          console.log(`🚨 Stop-loss triggered for ${trade.pair}! Price ${currentPrice} <= stop-loss ${trade.stop_loss_price}`);

          // Place sell market order
          await placeOrder({
            pair: trade.pair,
            side: 'SELL',
            orderType: 'MARKET',
            quantity: trade.quantity,
            price: '0.00'
          });

          // Mark trade as closed/stopped
          await execute(
            `UPDATE trades 
             SET status = 'stopped', 
                 closed_at = ?,
                 stop_loss_price = ? 
             WHERE id = ?`,
            [
              new Date().toISOString(),
              currentPrice.toFixed(4),
              trade.id
            ]
          );

          console.log(`✅ Closed stopped position for trade ID ${trade.id} on SoDEX.`);
        }
      } catch (err) {
        console.error(`Error monitoring stop-loss for trade ID ${trade.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in executeStopLossMonitoring:', err);
  }
}
