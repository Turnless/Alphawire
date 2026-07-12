# Incident Runbook for AlphaWire Trading Engine

This document provides step-by-step procedures for handling critical system incidents, API failures, risk limit triggers, and emergency operations.

---

## Operational Standards and Styling Rules

To maintain visual and technical consistency across all AlphaWire user interfaces and document logs:
1. **No Emojis:** Do not include any emojis in system logs, user-facing wire feeds, source code comments, or configuration files.
2. **Dark Mode Only:** All console interfaces, dashboards, and reporting frontends must use dark mode styling exclusively. 
3. **Typography Specifications:**
   - **Display Header Font:** Syne
   - **Body/UI Font:** Space Grotesk
   - **Numbers/Monetary Values Font:** Space Mono
4. **VANILLA CSS:** Never use Tailwind CSS or other utility-first frameworks. Use vanilla CSS with custom variables for visual consistency.

---

## 1. Circuit Breaker Trips

A daily loss circuit breaker trip is indicated by the `DAILY_LOSS_LIMIT_EXCEEDED` pre-trade check gate failing.

### Step 1.1: Check Drawdown Logs
To diagnose the trip, query the SQLite/Turso database for all trades stopped or closed in the last 24 hours:
```sql
SELECT * FROM trades 
WHERE (status = 'stopped' OR status = 'closed')
  AND closed_at >= datetime('now', '-24 hours');
```
Review the difference between `fill_price` and `stop_loss_price` multiplied by `quantity` for each trade to find individual trade losses.

### Step 1.2: Confirm Smart Contract Balances
Ensure the database-calculated portfolio values align with actual on-chain balances. Retrieve active balances directly from the SoDEX smart contracts using the web interface or by invoking the API method:
- Method: `getAccountState(userAddress)`
- Expected Output:
  ```json
  {
    "accountId": "acc-id",
    "walletAddress": "0x...",
    "balances": [
      { "asset": "USDC", "free": "6000.00", "locked": "0.00" },
      { "asset": "BTC", "free": "0.10", "locked": "0.00" }
    ]
  }
  ```
Confirm that these amounts match the actual assets under control of the trading wallet.

### Step 1.3: Verify Safety Bounds
Check if the daily loss ratio exceeds the 15% threshold:
- **Formula:** `Loss Ratio = Total Loss / (Portfolio Value + Total Loss)`
- If the Loss Ratio is greater than `0.15`, the gate will remain locked until the 24-hour window from the oldest closed trade has elapsed.
- If a manual override is authorized to reset the circuit breaker, execute:
  ```sql
  UPDATE trades SET status = 'closed_manual' WHERE status = 'stopped';
  ```

---

## 2. Stop-Loss Execution Failures

A stop-loss failure occurs when the asset price falls below `stop_loss_price` but the position status in the DB remains `filled` or the SELL order fails to execute on SoDEX.

### Step 2.1: Manual Liquidation on SoDEX
If the automated cron scheduler `executeStopLossMonitoring` fails to close a position, perform manual liquidation:
1. Access the SoDEX trading portal or run the manual trade script.
2. Formulate a manual REST market order payload:
   ```json
   {
     "pair": "BTC-USDC",
     "side": "SELL",
     "orderType": "MARKET",
     "quantity": "0.10",
     "price": "0.00"
   }
   ```
3. Issue a POST request to `/trade/orders` using your configured API key credentials to close out the position.

### Step 2.2: EIP-712 Recovery Procedures
If orders fail due to EIP-712 signature verification errors, reconstruct and verify the signing parameters:
1. **Domain Parameters:**
   - **Name:** `'spot'` or `'futures'`
   - **Version:** `'1'`
   - **Chain ID:** `286623` for mainnet, `138565` for testnet
   - **Verifying Contract:** `0x0000000000000000000000000000000000000000`
2. **Types Definition:**
   ```json
   {
     "ExchangeAction": [
       { "name": "payloadHash", "type": "bytes32" },
       { "name": "nonce", "type": "uint64" }
     ]
   }
   ```
3. **Payload Verification:**
   - Ensure keys in `params` are ordered correctly based on Go struct expectations (e.g. `newOrder` ordered as: `pair`, `side`, `orderType`, `quantity`, `price`, `stopPrice`, `funds`).
   - Check that numbers/monetary inputs are cast to decimal strings.
   - Verify that the recovered address from the signature matches the registered `X-API-Key` (API key private key) and is separate from the master wallet address.

---

## 3. SoDEX API Downtime

If the SoDEX API gateway goes offline, the trading engine cannot fetch prices or execute trades.

### Step 3.1: Timeout Diagnostics
Run connectivity checks to isolate connection issues:
- Test the endpoint:
  ```bash
  curl -I -m 5 https://testnet-gw.sodex.dev/api/v1/spot/markets
  ```
- If latency exceeds 2000ms or returns 5xx errors, verify the API gateway status.

### Step 3.2: Fallback RPCs
If the API gateway is down but the underlying blockchain network is operational, switch to fallback RPC nodes to query state:
- **Testnet Fallback RPC:** `https://testnet-rpc.sodex.dev`
- **Mainnet Fallback RPC:** `https://mainnet-rpc.sodex.dev`
Update the `SODEX_API_BASE_URL` or fallback environment variables in your server setup to direct read calls through these RPC nodes.

### Step 3.3: Raw Transaction Broadcast
To bypass the API gateway and manually close/open positions:
1. Connect via ethers.js to the fallback RPC node.
2. Sign a raw transaction matching the smart contract's execution function using the master wallet private key (`SODEX_MASTER_PRIVATE_KEY`).
3. Broadcast the signed raw transaction directly to the block explorer or RPC node:
   ```javascript
   const tx = await signer.sendTransaction({
     to: verifyingContractAddress,
     data: rawTransactionCallData
   });
   await tx.wait();
   ```

---

## 4. Emergency Kill-Switch

When an active exploit, abnormal market volatility, or incorrect position sizing is detected, activate the emergency kill-switch.

### Step 4.1: Flip Vercel Edge Config State
1. Open your **Vercel Dashboard**.
2. Navigate to **Edge Config** -> **Values**.
3. Locate the key `trading_paused` and change its value to:
   ```json
   true
   ```
This updates the config value globally in less than 50ms, halting all future trade evaluations.

### Step 4.2: Telegram Bot '/pause' Command
If you are away from your dashboard, issue the pause command via Telegram:
1. Open the Telegram chat with your AlphaWire Bot.
2. Send the command:
   ```text
   /pause
   ```
3. Verify that the bot replies with confirmation:
   `"AlphaWire Trading Kill-Switch Triggered. Automated execution is now PAUSED."`
4. Use the `/status` command to verify that all subsequent checks report `KILL_SWITCH_ACTIVE`.
