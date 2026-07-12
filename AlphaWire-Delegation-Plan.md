# AlphaWire — Work Breakdown & Delegation Plan

**Assumptions (context block was left as template placeholders):** team of 5 — 2 senior devs, 3 junior devs — on a ~3–4 week buildathon-style timeline. Swap names/counts if your real roster differs; the dependency chain and risk calls don't change.

**Role legend**

| Role | Focus |
|---|---|
| **Senior A** | Backend architecture, SoDEX/trading, risk & security, CI/CD, deployment |
| **Senior B** | AI/narrative engine, SoSoValue integration, story generation, orchestration |
| **Junior 1** | Frontend — Wire feed, story detail, charts |
| **Junior 2** | Frontend — Dashboard, Portfolio, Telegram/integration wiring |
| **Junior 3** | API routes (CRUD-shape), testing infra, CI, documentation |

General delegation logic: anything touching real signing keys, money movement, or the core scoring/detection algorithm is **senior-owned** (mistakes there are silent and expensive). Isolated UI, CRUD routes, client wrappers around well-documented REST APIs, and test/doc scaffolding are **junior-owned**, with senior review on anything that feeds the trade path.

---

## 1. Database Design & Schema

| Task | Owner | Dependencies | Tests Required | Risk Notes |
|---|---|---|---|---|
| Finalize SQLite schema — `stories`, `narrative_history`, `narrative_shifts`, `trades`, `etf_flows`, `news_items`, `sector_data` + indexes | Senior A | None (day 1) | Migration test asserting all tables/indexes exist; FK & NOT NULL constraint tests | SQLite has no native DECIMAL — `quantity`/`price` stored as TEXT strings; needs app-level validation or float-precision bugs will leak into trade sizing |
| `db.js` helper module — connection, prepared statements, WAL mode | Senior A | Schema finalized | Unit tests per CRUD helper against a temp SQLite file | WAL mode must be explicitly enabled or the "crash safety" claim in ARCHITECTURE.md isn't real — easy to silently skip |
| Migration/seed script for local dev | Junior 3 | Schema finalized | Fresh-DB run test; idempotency test (re-run doesn't error) | No migration framework specified (raw SQL) — recommend a lightweight one even for SQLite, or schema drift across dev machines is guaranteed |
| TTL cleanup job (etf_flows 24h, news_items 48h, etf_history 7d) | Junior 1 (senior review) | `db.js` | Unit test: rows older than TTL are purged, newer ones survive | `narrative_history` and `trades` have no stated retention — confirm these are meant to be permanent (audit trail) before anyone adds a cleanup job for them by mistake |
| Backup strategy (daily backup per ARCHITECTURE.md) | Senior A | `db.js` | Restore-from-backup test | **Flagged below in launch blockers** — SQLite file on Vercel's serverless filesystem isn't reliably persistent across deploys/instances; backups don't fix that, they mask it |

---

## 2. Backend Architecture & API Contracts

| Task | Owner | Dependencies | Tests Required | Risk Notes |
|---|---|---|---|---|
| `SoSoValueClient` (`src/lib/sosovalue.js`) — REST wrapper, retry/backoff, rate-limit handling | Junior 3 (senior B pairs on retry logic) | None — parallel with DB work | Unit tests mocking fetch per endpoint, incl. 429 retry path | Demo tier is 20 calls/min — cron jobs + dashboard refreshes + narrative polling will collide; needs a shared rate-limit queue, not per-call backoff alone |
| `SoDEX` client + EIP-712 signing (`src/lib/sodex.js`) — build against SoDEX's real `ExchangeAction`/`payloadHash` spec, not the `NewOrder`-struct example in API_INTEGRATION.md | Senior A | None — parallel | Unit test signing against known vectors; integration test placing a testnet order | Confirmed via SoDEX's own docs: domain is `{name:"spot"/"futures", chainId:286623 mainnet / 138565 testnet, verifyingContract:0x0...0}`; you sign `{payloadHash, nonce}` only, where `payloadHash = keccak256(compact JSON of {type, params})` with JSON key order matching SoDEX's Go struct field order exactly. Also split `SODEX_PRIVATE_KEY` into a master key (used once, for `addAPIKey`) and a separate API key used for daily signing — don't sign trades with the master key |
| OpenAI client (`src/lib/openai.js`) — story gen + narrative classification prompts | Senior B | None | Unit test with mocked response; snapshot test on prompt rendering | LLM can hallucinate in the "AI Analysis" paragraph — since published stories are the trade rationale, add a data-fidelity check (cross-reference cited numbers against source data) before publish |
| `engine/narrative.js` — classifier & temperature tracker | Senior B | Schema, `db.js`, SoSoValue client | Unit tests for NewsScore/FlowScore/SectorScore vs. fixture data; property test keeping Temperature in [0,100] | Keyword-frequency NLP is crude — a keyword used in an unrelated or negated context can still trigger `sentiment_alignment` |
| `engine/shift-detector.js` | Senior B | `narrative.js` | Unit tests at exact thresholds (cooling=15, heating=20, confidence=80) + edge cases | Cold-start problem: first 48h post-deploy has no history — `get_temp(hours_ago=48)` needs an explicit null guard or it breaks on day one |
| `engine/trade-engine.js` — risk engine, order builder, executor glue | Senior A | SoDEX client, shift-detector, schema | Integration test running all 5 pre-trade gates individually against fixture account states; testnet e2e for a full buy | The 15%-daily-loss circuit breaker is the single most important safety control — its "24h portfolio value" baseline calc needs its own dedicated test, since a silent failure here defeats the whole risk system |
| `/api/stories`, `/api/narrative` routes | Junior 3 | `db.js`, `narrative.js` | Integration tests: GET/POST, pagination, 404s | Standard CRUD — good junior task, low risk |
| `/api/trade` route | Senior A | `trade-engine.js` | Integration test confirming route enforces `AUTO_TRADE_ENABLED` + confirmation step server-side | Highest-value attack surface in the app — must re-validate trade size/side against `RISK_CONFIG` server-side even if the frontend already enforces it |
| `/api/webhook` (Telegram) | Junior 1 | None — parallel | Test with valid vs. invalid Telegram secret token | Unauthenticated webhooks are a classic injection vector — validate Telegram's signature, don't trust payload content |
| SSE endpoint (`/api/stories/stream`) + in-process event bus | Senior B | `db.js`, `/api/stories` | Integration test: publish → client sees event within N ms | Long-lived SSE connections are awkward on Vercel serverless — confirm Edge Runtime streaming support or move this to the Railway-hosted process |
| Cron/scheduler wiring (all jobs in the ARCHITECTURE.md schedule table) | Senior B | Fetch/generate/trade functions all exist | Manual trigger test per job; test for no overlapping runs (lock/mutex) | `node-cron` assumes a long-lived process — doesn't work in serverless. This needs Vercel Cron or to live entirely on the Railway engine, not both half-implemented |

---

## 3. Frontend Implementation

| Task | Owner | Dependencies | Tests Required | Risk Notes |
|---|---|---|---|---|
| Shared layout/theme (`layout.js`, `ThemeProvider`, `globals.css`) | Junior 1 | None | Visual smoke test | Low risk |
| `Header`, `LiveIndicator` | Junior 1 | Layout | Unit test SSE-connected state toggling | Low risk |
| Wire feed: `StoryCard`, `StoryFeed`, `FlowChart`, `SectorHeatmap` | Junior 1 | `/api/stories`, SSE endpoint | Component tests with mock data; live-append test on SSE event | Reverse-chronological feed needs pagination/virtualization or the DOM balloons after a few weeks of stories |
| Story detail (`/story/[id]`) | Junior 1 | `/api/stories`, wire feed | Renders LLM-generated markdown safely | Story body is LLM output rendered client-side — **must sanitize**; a malformed or injected response shouldn't be able to run as script |
| Dashboard: `BubbleMap` (D3), `Timeline`, `TemperatureGauge`, `ShiftAlert` | Junior 2 (Senior B reviews D3 integration) | `narrative.js`, SSE | Unit test bubble sizing/color vs. known temperature inputs | D3-mutates-DOM vs. React-re-renders is a classic conflict — get the integration pattern senior-reviewed before it's replicated across 4 components |
| Portfolio: `PortfolioView`, `TradeHistory`, `RiskDashboard`, `QuickTrade` | Junior 2 | `trade-engine.js`, `/api/trade` | `QuickTrade` test: cannot submit without confirmation step; `RiskDashboard` renders correct stop-loss from fixtures | `QuickTrade` is a manual override into a real-money path — needs the same server-side re-validation as the API route, plus an unmistakable testnet-vs-mainnet visual indicator |
| Chart wiring (Recharts: flow/allocation/performance) | Junior 1 | Wire + Portfolio pages | Renders with empty/partial data without crashing | Empty-state handling is commonly skipped — call it out explicitly in review |
| Framer Motion transitions (shift animations, live updates) | Junior 2 | Dashboard | Manual QA only | Low priority polish — first thing to cut if the schedule slips |

---

## 4. Third-Party / External Integrations

| Task | Owner | Dependencies | Tests Required | Risk Notes |
|---|---|---|---|---|
| SoSoValue integration hardening (auth, rate-limit queue, retry) | Senior B | Base client | Integration test against SoSoValue sandbox/demo key | Demo-tier key requires Buildathon-form approval — confirm it's provisioned on day one; it's an external dependency outside the team's control |
| SoDEX testnet integration + funding | Senior A | Base client | End-to-end testnet round-trip: place → fill → stop-loss trigger → cancel | Testnet liquidity/pricing may not reflect real conditions — "works on testnet" isn't validation for mainnet slippage |
| Telegram bot (alerts, webhook, daily digest) | Junior 2 | `/api/webhook` | Smoke test sending to a private test channel | Bot token leakage via logs; Telegram rate limits on bulk digest sends |
| OpenAI cost/latency guardrails | Senior B | OpenAI client | Test that story generation falls back to template on API failure/timeout (per documented fallback) | GPT-4o cost scales with 4h pulse + hourly classification + daily deep-dive cadence — set a cost ceiling/alert before this runs unattended |
| EIP-712 domain/contract verification | Senior A | SoDEX client | Signature verification test against SoDEX's actual verifying contract on testnet | Confirmed real values: `chainId` 286623 (mainnet) / 138565 (testnet), `domain.name` `"spot"` or `"futures"` (not `"SoDEX"`), `verifyingContract` `0x0...0` (this one was already correct). Nonces must land within (T−2 days, T+1 day) of the block timestamp and are tracked per signing address — a shared nonce counter across concurrent strategies will race |

---

## 5. Testing Strategy

| Task | Owner | Dependencies | Tests Required | Risk Notes |
|---|---|---|---|---|
| Unit test infra (Jest/Vitest) + coverage tooling | Junior 3 | None — set up early | N/A, this is the infra | Low risk |
| Narrative scoring + shift-detection unit tests | Senior B | `narrative.js`, `shift-detector.js` | Target ≥85% coverage on `engine/` — this is the core IP | Needs realistic fixture data shaped like real ETF flows, not synthetic numbers, or tests pass while the real algorithm misbehaves |
| `trade-engine.js` integration tests (pre-trade checklist) | Senior A | `trade-engine.js` | All 5 gates tested individually (auto-trade off, cooldown, daily loss, max positions, paused) | Run against a mocked SoDEX in CI — live testnet calls in CI are flaky and slow |
| Frontend component tests | Junior 1 & 2 | Respective components | Target ≥60% coverage on `components/` | Low-medium risk |
| E2E (Playwright/Cypress): publish → dashboard reflects narrative → simulated shift → testnet trade → story updates | Junior 3 (Senior A reviews) | Full stack on staging | Full happy-path pass | E2E against live testnet is slow/flaky — build a "shift simulator" mode that injects a fake shift signal instead of waiting on real market conditions |

---

## 6. CI/CD Pipeline

| Task | Owner | Dependencies | Tests Required | Risk Notes |
|---|---|---|---|---|
| CI skeleton: lint, typecheck, build on every PR | Junior 3 | Repo exists | N/A | Low risk |
| Test-gated merge (unit + integration must pass) | Junior 3 | Section 5 tests exist | N/A | Don't gate every PR on e2e — too slow; run e2e on merge to main instead |
| Staging deploy on merge to main (Vercel preview + Railway staging) | Senior A | CI skeleton | Smoke test post-deploy | Staging must hard-pin `AUTO_TRADE_ENABLED=false` and testnet URLs — a config leak that promotes mainnet settings to staging is a real incident, not a hypothetical one |
| Production deploy gate (manual approval) | Senior A | Staging green, full suite green | N/A | Any deploy touching `sodex.js` or `trade-engine.js` should require **both** seniors' sign-off, not just green CI |
| Secrets management in CI (`SODEX_PRIVATE_KEY`, `OPENAI_API_KEY`, etc.) | Senior A | Set up early | N/A | Confirm build logs are redacted — a signing key that ever hits a CI log is burned and must be rotated |

---

## 7. Security & Code Review

| Task | Owner | Dependencies | Tests Required | Risk Notes |
|---|---|---|---|---|
| PR policy: 1 senior approval required for anything touching `sodex.js`, `trade-engine.js`, or `/api/trade` | Senior A | None | N/A | Without an enforced rule, a well-intentioned refactor can quietly loosen a risk check |
| Secrets audit — confirm no key reaches the client bundle | Senior A | Env vars finalized | Build-output grep for key material | Next.js exposes anything prefixed `NEXT_PUBLIC_` to the browser — one naming mistake on any of the four keys is a full compromise |
| Rate-limit/abuse protection on public routes (`/api/stories`, `/api/webhook`) | Junior 3 (Senior B reviews) | Routes exist | Load test with burst traffic | A public wire feed with no rate limiting is scrapeable and DoS-able |
| Dependency/security scan (`npm audit`, `pip-audit`) in CI | Junior 3 | CI skeleton | N/A | `ethers` and other EVM-signing libs are high-value supply-chain targets — pin versions, review major upgrades manually |
| Pre-mainnet security checklist & sign-off | Both seniors | Everything above | N/A | This is the actual gate before `AUTO_TRADE_ENABLED=true` is ever flipped on mainnet — treat as non-negotiable, not a formality |

---

## 8. Documentation

| Task | Owner | Dependencies | Tests Required | Risk Notes |
|---|---|---|---|---|
| API contract docs (routes, request/response shapes) | Junior 3 | Routes stabilized | N/A | Keep in sync with actual route code, not the aspirational README |
| README refresh (setup, env vars, demo script) | Junior 1 | App runs end-to-end | N/A | Existing draft is already strong — mostly a maintenance task |
| Onboarding notes (local setup, testnet keys, running `engine/main.py` alongside `npm run dev`) | Junior 2 | Integrations working locally | N/A | Low risk |
| Incident runbook — circuit breaker trips, stop-loss fails to fire, SoDEX API down | Senior A | `trade-engine.js`, error-handling table in ARCHITECTURE.md | N/A | Without this, a 3am incident touching live funds has no playbook — treat as launch-blocking, not nice-to-have |

---

## 9. Deployment & Monitoring

| Task | Owner | Dependencies | Tests Required | Risk Notes |
|---|---|---|---|---|
| Resolve SQLite-on-Vercel architecture mismatch — migrate `db.js` to Turso (`@tursodatabase/serverless` or `@libsql/client`) via Vercel's native Turso integration | Senior A | Schema finalized | Read/write test confirming durability across separate function invocations | **Launch blocker.** Schema/SQL carry over unchanged; `db.js` needs a rewrite since Turso's client is async where `better-sqlite3` was synchronous. Fallback: move the whole app to Railway with a persistent volume — no code change, bigger infra lift |
| Testnet vs. mainnet environment separation | Senior A | CI staging deploy | Config diff test between environments | One misconfigured env var is the difference between a demo trade and a real one |
| Logging/error tracking (Sentry or similar) for engine + API routes | Junior 3 | Core routes exist | N/A | Trade failures and LLM fallbacks specifically need to be loud per the documented error table — don't let them fail silently |
| Cron heartbeat/health monitoring (did `fetch-etf-flows` actually run in the last 4h?) | Junior 2 | Scheduler wiring | Alert-fires test on missed heartbeat | A silently-failed cron job degrades story quality with zero visible signal |
| Rollback plan + a trading kill-switch built on Vercel Edge Config, checked by `trade-engine.js` on every pre-trade cycle | Senior A | Deploy gate | Kill-switch flip test end-to-end (toggle → next cycle honors it, no redeploy) | Edge Config reads are near-instant and update without a rebuild. Pair with a `/pause` Telegram command (bot already exists) so it's reachable from a phone during an incident |

---

## Suggested Build Order / Sprint Sequence

**Sprint 0 (setup, few days) — parallel tracks**
DB schema (Senior A) · CI skeleton (Junior 3) · SoSoValue + SoDEX client stubs (Senior B / Senior A) · layout/theme (Junior 1) · secrets scaffolding (Senior A)

**Sprint 1 (week 1) — core engines**
`narrative.js` classifier, SoDEX testnet connectivity, story generation pipeline, base API routes (`/api/stories`, `/api/narrative`), wire feed frontend skeleton

**Sprint 2 (week 2) — the hard middle**
`shift-detector.js`, `trade-engine.js` + risk gates, dashboard frontend, portfolio frontend, Telegram integration, SSE wiring, scheduler

**Sprint 3 (week 3) — integration & hardening**
Integration + e2e tests, security review, docs, CI test-gating, staging deploy, resolve the SQLite/Vercel question, monitoring/heartbeats

**Sprint 4 (buffer/launch) — go-live**
Pre-mainnet checklist, incident runbook, final QA, testnet demo rehearsal, launch

---

## Things That Would Block Launch If Skipped

1. **SQLite persistence on Vercel** — resolved by migrating `db.js` to Turso (Vercel's native integration); schema unchanged, `db.js` rewrite required.
2. **EIP-712 signing spec was wrong, not just placeholder values** — real domain is `{name:"spot"/"futures", chainId:286623/138565, verifyingContract:0x0...0}`, and the signed type is `{payloadHash, nonce}`, not the order fields directly. `sodex.js` needs a rebuild against SoDEX's actual docs.
3. **Circuit breaker's 24h-loss baseline is unverified** — the single most important safety control needs a dedicated correctness test, not just a code review.
4. **No server-side re-validation on `/api/trade` or `QuickTrade`** — client-side risk checks alone are not a control.
5. **No kill-switch independent of a full redeploy** — resolved via Vercel Edge Config + a Telegram `/pause` command, checked every `trade-engine.js` cycle.
6. **Cold-start guard missing in `shift-detector.js`** — first 48h post-deploy has no history to compare against.
7. **No rate limiting on public routes** — wire feed and webhook are both exposed surfaces today.
8. **No incident runbook** — nothing documents what a human does when the system misbehaves with live funds involved.
9. **SoSoValue Buildathon API key approval** is an external dependency — confirm it's in hand before Sprint 1 depends on it.
10. **Testnet/mainnet config separation isn't enforced in CI** — nothing currently prevents a staging deploy from accidentally carrying mainnet settings.
