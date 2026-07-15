# Cinder — Launch & Finalization Plan

This document outlines the step-by-step checklist and action plan to finalize the **Cinder** autonomous AI wire service and trading system for a production mainnet environment.

---

## 📊 1. Current Implementation Status

Cinder's core architecture is fully coded and verified, passing all unit and integration tests (65 tests across 5 test suites).

### Fully Implemented Layers
- **Data Ingestion Layer** ([sosovalue.js](file:///C:/Users/user/Alpha/src/lib/sosovalue.js)): Correctly wraps SoSoValue APIs (ETF flows, AI news feed, sector performance) with retry logic and caching.
- **Narrative Intelligence Layer** ([narrative.js](file:///C:/Users/user/Alpha/src/engine/narrative.js) & [shift-detector.js](file:///C:/Users/user/Alpha/src/engine/shift-detector.js)): Classifies market states into 8 pre-defined archetypes, calculates real-time narrative temperatures, and detects regime shifts using multi-signal validation.
- **Execution & Risk Layer** ([trade-engine.js](file:///C:/Users/user/Alpha/src/engine/trade-engine.js) & [sodex.js](file:///C:/Users/user/Alpha/src/lib/sodex.js)): Evaluates 5 pre-trade risk gates (cooldown, max positions, daily loss circuit breaker, kill-switch, environment mismatch check) and monitors positions using an 8% trailing stop-loss checked every 5 minutes. Orders are securely signed using EIP-712.
- **Data Storage Layer** ([db.js](file:///C:/Users/user/Alpha/src/lib/db.js)): Configured with `@libsql/client` (Turso), allowing seamless switching between local SQLite (`local.db`) files and remote Turso cloud DB instances.
- **Presentation Layer** (Next.js & Vanilla CSS):
  - **Landing Page** (`/`): Implements EIP-1193 wallet connection and absolute-positioned glassmorphic teaser gating for logged-out users.
  - **Live Wire Feed** (`/feed`): Renders live AI-generated stories and real-time news with server-sent event updates.
  - **Dashboard** (`/dashboard`): Visualizes narratives using interactive bubble charts and timeline logs.
  - **Portfolio View** (`/portfolio`): Details net asset value, PnL, open positions, active stop-losses, and provides a QuickTrade widget.

---

## 🚨 2. Gaps & Finalization Action Plan

The following tasks are required to bridge the local development state to a production-ready mainnet deployment.

### Task 2.1: Database Durability & Cloud Migration
- **Problem**: In serverless hosting (e.g. Vercel), the local file system is ephemeral. If the database defaults to writing to `file:local.db`, all data (stories, trades, narrative temperatures) will be destroyed when serverless instances cold-start or scale.
- **Action Items**:
  1. Provision a remote **Turso DB** instance in the Turso console.
  2. Apply the schema migration SQL file ([0001_init.sql](file:///C:/Users/user/Alpha/migrations/0001_init.sql)) using the DB initialization script:
     ```bash
     TURSO_DATABASE_URL=libsql://your-db-subdomain.turso.io TURSO_AUTH_TOKEN=your-auth-token node scripts/db-init.js
     ```
  3. Update production environment variables on Vercel/Railway:
     ```env
     TURSO_DATABASE_URL=libsql://your-db-subdomain.turso.io
     TURSO_AUTH_TOKEN=your-auth-token
     ```

### Task 2.2: Production Scheduler Setup
- **Problem**: Next.js API routes are serverless functions and cannot run long-lived background tasks. The in-process `node-cron` scheduler inside [scheduler.js](file:///C:/Users/user/Alpha/src/lib/scheduler.js) will fail to run when deployed to Vercel.
- **Action Items**:
  - **Option A (Railway Background Worker - Recommended)**:
    Create a persistent worker daemon script `scripts/worker.js`:
    ```javascript
    import '../src/lib/scheduler.js';
    console.log('[INFO] Cinder Background Scheduler Worker Active.');
    ```
    Configure the Railway project to deploy this background task alongside the web frontend.
  - **Option B (Serverless Cron Routes)**:
    1. Expose scheduled endpoints under `/api/cron/hourly` (for news updates and narrative shift checks) and `/api/cron/stop-loss` (for stop-loss monitoring).
    2. Protect the endpoints with a secret token validation:
       ```javascript
       if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
       }
       ```
    3. Configure `vercel.json` cron schedules to call these endpoints at the required intervals.

### Task 2.3: Zero-Emoji Compliance Logging Audit
- **Problem**: The pre-mainnet verification checklist ([PRE_MAINNET_CHECKLIST.md](file:///C:/Users/user/Alpha/docs/PRE_MAINNET_CHECKLIST.md)) enforces a strict "Zero-Emoji" standard for logs, codebase comments, and UI. Currently, logging strings in [trade-engine.js](file:///C:/Users/user/Alpha/src/engine/trade-engine.js) and [scheduler.js](file:///C:/Users/user/Alpha/src/lib/scheduler.js) utilize emojis (e.g. `🔄`, `🚨`, `❌`, `⚡`, `✅`, `📰`).
- **Action Items**:
  1. Refactor logs in [trade-engine.js](file:///C:/Users/user/Alpha/src/engine/trade-engine.js) to replace emojis with standard uppercase bracket flags:
     - Replace `🔄` with `[SYNC]` or `[INFO]`
     - Replace `🚨 ALERT:` with `[ALERT]`
     - Replace `❌` with `[ERROR]` or `[FAILED]`
     - Replace `⚡` with `[EXECUTION]`
     - Replace `✅` with `[SUCCESS]`
     - Replace `📰` with `[PUBLISH]`
  2. Verify that console outputs and web UI views conform to the standard, keeping all elements clean, technical, and emoji-free.

### Task 2.4: SoDEX API Key Registration helper
- **Problem**: Private endpoints on SoDEX require EIP-712 signed request headers generated using an API Key Name and API Key Private Key. These credentials must first be registered on-chain via the SoDEX smart contracts using the master wallet private key.
- **Action Items**:
  1. Add a utility script `scripts/register-sodex-api-key.js`:
     ```javascript
     import { ethers } from 'ethers';
     // Setup provider and wallet using SODEX_MASTER_PRIVATE_KEY
     // Invoke contract.addAPIKey(apiKeyName, apiKeyAddress, permissions)
     // Output the corresponding generated API Key Private Key for environment variables
     ```
  2. Execute the registration against the SoDEX contract on the target testnet/mainnet, and store the output credentials securely in the environment parameters.

### Task 2.5: Story Data Fidelity Validation
- **Problem**: Breaking story articles generated by the LLM act as the trading rationale. If the LLM hallucinates numbers, the published narrative will conflict with database flow records.
- **Action Items**:
  1. Create a validation module `src/lib/validator.js` to cross-reference LLM output against raw database data.
  2. In [trade-engine.js](file:///C:/Users/user/Alpha/src/engine/trade-engine.js), run the validation checks on `storyBody` before database insertion. For example, verify that cited net inflows or sector rotations align with the values stored in `etf_flows` and `sector_data`.
  3. If validation fails, fall back to a structured template-based story that explicitly links database parameters to preserve audit trail integrity.

### Task 2.6: Caching DB Pruning (TTL Cleanups)
- **Problem**: Cinder caches raw news items and ETF flows continually. Without a pruning schedule, tables will experience bloating over time.
- **Action Items**:
  1. Implement a database cleanup task inside [scheduler.js](file:///C:/Users/user/Alpha/src/lib/scheduler.js):
     ```javascript
     export async function runPruningCycle() {
       console.log('[INFO] Initiating database cache pruning cycle...');
       await execute("DELETE FROM news_items WHERE fetched_at < datetime('now', '-48 hours')");
       await execute("DELETE FROM etf_flows WHERE fetched_at < datetime('now', '-24 hours')");
       console.log('[SUCCESS] Database cache successfully pruned.');
     }
     ```
  2. Schedule this job to run once every 24 hours.

### Task 2.7: Gasless Paymaster Relay Integration (EIP-4337)
- **Problem**: The Smart Account gasless features (such as CNDR faucet claims and gasless swaps) are currently simulated on the frontend. A live testnet deployment requires wallet transactions to be wrapped as UserOperations and relayed via bundlers.
- **Action Items**:
  1. Integrate an account abstraction SDK (e.g. Biconomy or Pimlico) inside [WalletContext.js](file:///C:/Users/user/Alpha/src/context/WalletContext.js).
  2. Set up the paymaster parameters in `.env` to fund gas transactions for testnet users, and link the paymaster to the deployed [CinderToken.sol](file:///C:/Users/user/Alpha/contracts/CinderToken.sol) contract.

---

## ⚙️ 3. Production Environment Variables Configuration

Ensure the following variables are configured in the host environment (e.g. Vercel and Railway settings):

```env
# --- SoSoValue Data API ---
SOSOVALUE_API_KEY=your_sosovalue_api_key

# --- Database Integration (Turso) ---
TURSO_DATABASE_URL=libsql://cinder-db.turso.io
TURSO_AUTH_TOKEN=your_turso_db_auth_token

# --- SoDEX Execution Credentials ---
SODEX_API_KEY_NAME=cinder-production-key
# Private key generated from addAPIKey registration transaction
SODEX_API_KEY_PRIVATE_KEY=0x...
# Target gateway URL (e.g. testnet or mainnet)
SODEX_API_BASE_URL=https://testnet-gw.sodex.dev/api/v1
# User wallet address for balance queries and trades
USER_WALLET_ADDRESS=0x...

# --- OpenAI Language Models ---
OPENAI_API_KEY=your_openai_api_key

# --- Emergency Kill-Switch & Alerts ---
EDGE_CONFIG_URL=https://edge-config.vercel.com/ecfg_...
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_alerts_chat_id

# --- Risk Engine Guidelines ---
NARRATIVE_TRADE_THRESHOLD=80
MAX_ALLOCATION_PER_TRADE=0.30
STOP_LOSS_PERCENTAGE=0.08
COOLDOWN_HOURS=48
AUTO_TRADE_ENABLED=true
```

---

## 🏃 4. Pre-Mainnet Verification Runbook

Follow these verification steps before enabling live mainnet auto-trading (`AUTO_TRADE_ENABLED=true`):

1. **Verify Sandbox Isolation**:
   Confirm that `SODEX_API_BASE_URL` contains `testnet` and `CHAIN_ID` inside `sodex.js` is set to `138565` (testnet).
2. **Execute Database Seed**:
   Run `npm run build` or `node scripts/db-init.js` to ensure the Turso database schema compiles.
3. **Execute Trade Engine Integration Verification**:
   Run the test validation module:
   ```bash
   node scripts/test-trade-engine.mjs
   ```
   Verify that order building compiles and output logs show no EIP-712 signature verification errors.
4. **Verify Loss Limit Controls**:
   Execute the circuit-breaker simulation script:
   ```bash
   node scripts/test-circuit-breaker.mjs
   ```
   Confirm that the system halts and throws a `DAILY_LOSS_LIMIT_EXCEEDED` error if simulated stop-loss losses exceed 15% within a 24-hour period.
5. **Verify Edge Config Kill-Switch**:
   Update `trading_paused` in Vercel Edge Config to `true`. Check the logs to ensure the system reports `KILL_SWITCH_ACTIVE` and halts evaluations.
6. **Activate Mainnet Transition**:
   - Rotate endpoint configuration to mainnet URLs.
   - Set `AUTO_TRADE_ENABLED` to `true`.
