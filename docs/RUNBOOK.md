# 🚨 Cinder Incident Response Runbook

This runbook outlines standard operating procedures for resolving system incidents, API failures, or risk limit triggers affecting the Cinder autonomous trading system.

---

## 🧭 Quick Reference: Emergency Kill-Switch

If the system behaves abnormally or opens unexpected positions with live funds:

### Method 1: Telegram Webhook (From your phone)
Send the following message to your configured Telegram Bot chat:
```text
/pause
```
* **Expected Result:** The bot will respond with `"Cinder Trading Kill-Switch Triggered. Automated execution is now PAUSED."` All future pre-trade cycles will fail the `KILL_SWITCH_ACTIVE` risk gate.

### Method 2: Vercel Edge Config (No redeploy required)
1. Go to your **Vercel Dashboard** -> **Edge Config** tab.
2. Update the value of the key `trading_paused` to:
   ```json
   true
   ```
* **Expected Result:** The next pre-trade checks will immediately halt execution.

**Note:** If Edge Config is unreachable, the kill-switch now defaults to paused (trades halted). This is the fail-closed behavior. See `KILL_SWITCH_FAIL_CLOSED` in Environment Variables.

### Method 3: Environment Override (Fallback)
1. In your Vercel or Railway dashboard, change the environment variable:
   ```env
   AUTO_TRADE_ENABLED=false
   ```
2. Re-deploy the application to apply the change.

---

## 🛠️ Incident Scenarios & Action Playbooks

### Scenario A: Daily Loss Circuit Breaker Trips (`DAILY_LOSS_LIMIT_EXCEEDED`)

#### Symptoms
* Narrative shifts are detected, but the system logs `DAILY_LOSS_LIMIT_EXCEEDED` and halts trading.
* Notification sent to Telegram: `"Safety Check Failed: Drawdown limit reached."`

#### Diagnosis
1. Check the database trades table for recent stopped positions:
   ```sql
   SELECT * FROM trades WHERE status = 'stopped' AND closed_at >= datetime('now', '-24 hours');
   ```
2. Verify if the total losses (fill price vs stop-loss price) exceed 15% of the total portfolio value.

#### Resolution Procedure
1. **Investigate the Source:** Analyze why the stop-losses were hit. Was it a black swan market event or bad trade sizing?
2. **Review Risk Settings:** If the drawdown was expected due to extreme volatility and you wish to manually reactivate trading before the 24-hour window expires, you must manually reset/clear the trades table or wait for the 24h cooldown to roll over.
3. **Re-enabling Trading:** Run the system status check via Telegram (`/status`) to confirm the circuit breaker is back to `NOMINAL`.

---

### Scenario B: Trailing Stop-Loss Fails to Fire

#### Symptoms
* Asset prices on SoDEX drop past the -8% trailing stop-loss threshold, but the position remains open.
* Database status remains `filled` instead of `stopped`.

#### Diagnosis
1. Verify if the scheduler/cron monitoring is running (it triggers `executeStopLossMonitoring` every 5 minutes).
2. Check the logs of the background cron process to see if the connection to SoDEX or the local DB queries failed.

#### Resolution Procedure
1. **Manual Liquidation:** Connect your EVM Wallet to MetaMask and navigate to the `/portfolio` dashboard.
2. Click **Close Position** next to the active asset. This will trigger a manual EIP-712 signed market SELL order directly to SoDEX.
3. **Database Correction:** If the order was successfully executed on SoDEX manually, update the trade record in the SQLite database to avoid double-selling:
   ```sql
   UPDATE trades SET status = 'stopped', closed_at = datetime('now') WHERE status = 'filled' AND pair = 'BTC-USDC';
   ```

---

### Scenario C: SoDEX API Gateway Downtime (`SODEX_UNREACHABLE`)

#### Symptoms
* Logs show `Failed to fetch ticker` or `Authentication credentials must be configured`.
* `/portfolio` page displays `"Syncing Balances..."` infinitely or displays local fallbacks.

#### Diagnosis
1. Attempt to ping the SoDEX REST API status page or endpoint manually.
2. Check if your API key credentials (`SODEX_API_KEY_NAME`, `SODEX_API_KEY_PRIVATE_KEY`) have expired or were revoked on-chain.

#### Recovery Procedure
1. **Graceful Degradation:** The narrative engine will continue to run and publish news stories on the Wire Feed, but it will skip execution and flag the stories as `"Execution: Pending (Exchange Offline)"`.
2. **Re-registering API Keys:** If keys were revoked:
   * Run the addAPIKey configuration script using your master private key (`SODEX_MASTER_PRIVATE_KEY`) to register a new trading API key.
   * Update the environment variables in your deployment dashboard and restart the server.

---

### Scenario D: Database Corruption or Migration Lockup

#### Symptoms
* Server logs show `SQLITE_CORRUPT` or `Database is locked`.
* Web UI fails to load stories or write narrative history.

#### Recovery Procedure
1. **Resetting local cache:** Since SQLite/Turso database stores states, if a local SQLite instance gets corrupted:
   * Delete `local.db` in your workspace.
   * Re-run the migration schema using `npm run build` or `node scripts/db-init.js`.
2. **Restoring from Turso:** If using Turso cloud DB, utilize Turso's CLI to restore to a previous point-in-time backup:
   ```bash
   turso db restore <db-name> <backup-id>
   ```

---

## 📈 Post-Incident Procedures

1. **Log Analysis:** Export all JSON logs from Vercel/Railway for the period of the incident.
2. **Root Cause Analysis (RCA):** Document what triggered the failure, the timeline of detection, and the time to resolve.
3. **System Audit:** Run a full testnet dry-run cycle using the verification scripts before restoring auto-trading to `true`.
