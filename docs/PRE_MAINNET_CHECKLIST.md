# Pre-Mainnet Security Checklist

This document details the critical verification and audit procedures required before deploying the Cinder autonomous trading system to the production mainnet environment.

---

## Basic Design & Interface Rules

### 1. Zero-Emoji Enforcement
All source code, configuration files, logging outputs, UI elements, and documentation must be entirely free of emojis. Plain text status labels or symbols must be used instead.

### 2. Dark Theme Guidelines
The user interface must strictly conform to a dark-theme-only visual style. 
- Do not import or use Tailwind CSS.
- Implement vanilla CSS with custom variables for color styles.
- Define background elements using dark hex codes and text elements using high-contrast light colors.

### 3. Typography Configuration
Verify that the CSS stylesheet configures the following typography layout:
- Display/Headings: Syne
- Body/UI Text: Space Grotesk
- Numbers/Monetary Values: Space Mono

---

## 1. Secrets Audit

### 1.1 Private Key Git Ingestion Scans
Private keys and seed phrases must never be committed to git repositories.
- Run a Git search scan to verify that no files containing local database files, environment secrets, or private keys have been staged or committed.
- Check the [gitignore](file:///C:/Users/user/Alpha/.gitignore) file to confirm that `.env`, `.env.local`, `local.db`, and similar configuration files are ignored.
- Execute local pattern matching scans to verify no active secrets are in the codebase:
  ```bash
  # Check for typical private key formats
  grep -rnw "src" -e "0x[a-fA-F0-9]\{64\}"
  grep -rnw "src" -e "PRIVATE KEY"
  ```

### 1.2 Frontend Environment Prefix Audit
Next.js exposes environment variables starting with `NEXT_PUBLIC_` to the browser client bundle. 
- Ensure that no security-critical environment variables such as private keys, API secret tokens, or admin database credentials are prefixed with `NEXT_PUBLIC_`.
- Review the environment variable declarations in the Next.js bundle output or inspect the config to verify that variables like `USER_WALLET_ADDRESS`, `SODEX_API_KEY_PRIVATE_KEY`, and `SODEX_MASTER_PRIVATE_KEY` do not leak.
- Execute a grep check to verify:
  ```bash
  grep -rnw "src" -e "NEXT_PUBLIC_SODEX"
  grep -rnw "src" -e "NEXT_PUBLIC_USER_WALLET"
  ```

---

## 2. Wallet & Key Separation

For automated trade execution on SoDEX, the master wallet private key must be decoupled from the automated loop.

### 2.1 Master Private Key Lockdown
- The master private key (`SODEX_MASTER_PRIVATE_KEY`) is only used for one-time initialization procedures (e.g., registering an API key on-chain).
- Under no circumstances should `SODEX_MASTER_PRIVATE_KEY` be defined in production environment variables or serverless function runtimes.
- Confirm that the master private key is stored offline in a secure, encrypted hardware wallet or vault.

### 2.2 Trade Engine Signing Scope
- Verify that [trade-engine.js](file:///C:/Users/user/Alpha/src/engine/trade-engine.js) and [sodex.js](file:///C:/Users/user/Alpha/src/lib/sodex.js) only sign orders using the scoped API key private key (`SODEX_API_KEY_PRIVATE_KEY`) and API key name (`SODEX_API_KEY_NAME`).
- Verify that these API credentials only authorize trade execution (limit/market orders) on the specific pairs required, and do not possess withdrawal or transfer capabilities.

---

## 3. API Rate Limiting

Rate limiting controls are critical to protect public endpoints and webhook processing paths from resource exhaustion and Denial of Service (DoS) attacks.

### 3.1 Public Wire Feed Rate Limits
- The public wire feed is served via [route.js (stories)](file:///C:/Users/user/Alpha/src/app/api/stories/route.js).
- Confirm that the rate limiter defined in [rate-limiter.js](file:///C:/Users/user/Alpha/src/lib/rate-limiter.js) is active on this route.
- Verify that request counts are calculated using a sliding window algorithm (60-second window, maximum 60 requests per client IP address).
- Verify that rate-limiting headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are sent with each response.

### 3.2 Telegram Webhook Route Security and Rate Limits
- The Telegram webhook route is served via [route.js (webhook)](file:///C:/Users/user/Alpha/src/app/api/webhook/route.js).
- Verify that the sliding window rate limiter protects the endpoint from brute force requests.
- Verify that the webhook endpoint validates the secret token signature sent by Telegram (`X-Telegram-Bot-Api-Secret-Token` header) before executing command routes like `/pause` or `/resume`.
- Verify that invalid signatures return an immediate HTTP 401 Unauthorized status.

---

## 4. Heartbeat Checking

Continuous monitoring of cron executions and automated cycles is required to ensure stop-losses and narrative shifts are processed timely.

### 4.1 Cron Scheduler Heartbeats
- The background scheduling jobs are managed by [scheduler.js](file:///C:/Users/user/Alpha/src/lib/scheduler.js).
- Verify that the following cron jobs are running with their specified intervals:
  - `hourlyNewsJob`: Runs every hour (`0 * * * *`) to fetch AI news, update narrative temperatures, detect regime shifts, and execute trades.
  - `stopLossMonitoringJob`: Runs every 5 minutes (`*/5 * * * *`) to monitor active positions against their trailing stop-loss values.
  - `etfFlowsJob` and `sectorPerformanceJob`: Run every 4 hours (`0 */4 * * *`) to sync ETF data and sector performance metrics.
- Ensure that each cron task contains appropriate error catching blocks to prevent the scheduling runner process from crashing.

### 4.2 Logging Integrations
- Confirm that all execution milestones, failures, and api error states are logged to console standard outputs.
- Verify that the logs capture distinct messages for:
  - Successful API fetches and data refreshes.
  - Detected narrative shifts (specifying previous and new narrative states).
  - Risk checks results (including pause conditions or circuit breaker limits).
  - Stop-loss execution events (specifying target token, entry price, trigger price, and fill status).
- Configure third-party log drain services (e.g., Datadog, Axiom) to alert on errors or warning logs emitted by the application runtime.
