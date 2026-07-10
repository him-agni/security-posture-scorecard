# Handoff — Security Posture Scorecard

Living handoff doc. Update the **Status**, **Recent changes**, and **Next steps**
sections whenever the project moves. Last updated: **2026-07-10**.

**Recent changes (2026-07-10) — hardening pass.** Fixed real weak points found by
probing: (1) `fetchRepo` no longer **leaks its temp dir** on any post-`mkdtemp`
failure or timeout — it self-cleans and rethrows; (2) scan **timeout now aborts the
in-flight download** via `AbortSignal` and clears its timer (no more dangling 60s
timer); (3) **zip-slip guard** (`isSafeEntryPath`) on tarball extraction; (4)
**concurrency cap** on `/api/scan` (`config.maxConcurrentScans`, default 4) to stop
resource-exhaustion DoS on the expensive endpoint; (5) **per-IP rate limit** on
`/api/scan` (`config.rateLimit`, default 20/min/IP; sets `RateLimit-*` + `Retry-After`
headers; `trust proxy` off by default so a spoofed `X-Forwarded-For` can't bypass it);
(6) malformed/oversized JSON bodies now return **400/413 instead of 500**; (7)
`app.listen` guarded behind `require.main === module` so the app is importable in
tests. Verified safe (not weak points): ReDoS (0.15ms worst case under the line caps)
and symlink walking (symlinks are skipped by the file walk).

---

## 1. What this is

A tool that scans a **public GitHub repo** and returns a scored, graded security
scorecard across **three layers** (Frontend, Backend, Database). Its signature
trait: **every finding declares its own confidence** — `verified` / `detected` /
`manual` — so it never overclaims. Built as a Solutions-Engineer portfolio piece;
the credibility beat is *"the tool knows its own limits."*

- **Stack:** Node + Express API (stateless, no DB) · React 18 + Vite + Tailwind v4 + TanStack Query dashboard.
- **Flow:** `POST /api/scan {repoUrl}` → resolve repo (Octokit) → download+extract tarball → run all check modules over one file-tree context → weighted score → clean up temp dir → return report JSON.

## 2. Status — as of 2026-07-09

**All three layers complete, tested, and verified end to end.** Functionally an
MVP-complete product.

| Layer | State | Confidence profile |
| --- | --- | --- |
| 1 · Frontend | ✅ Done | mostly `verified` (incl. flagship secret scan) |
| 2 · Backend | ✅ Done | mostly `detected` + 2 `verified` fails (CORS, OSV) |
| 3 · Database | ✅ Done | mostly `manual` (advisory checklist) |

- **Tests:** server 89 passing (`cd server && npm test`); client Vitest 2 passing (`cd client && npm test`); Playwright 2 passing across desktop + mobile Chromium (`cd client && npm run test:e2e`).
- **Client build:** clean (`cd client && npm run build`).
- **Reskin:** dashboard uses a light mint/green palette with a dark animated side panel (radar-pulse, aurora blobs, twinkles), matching a supplied reference. Semantic pass/warn/fail colors kept for honesty.

### Running instances (this dev machine)
- API: `http://localhost:4000` (`cd server && npm start`)
- Dashboard: `http://localhost:5173` (`cd client && npm run dev`), proxies `/api` → 4000.
- ⚠️ These are started per-session and are **not** persistent services. If the
  port is occupied by a stale process: PowerShell
  `Get-NetTCPConnection -LocalPort 4000 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`.

## 3. Architecture & the one idea that matters

**Plugin/registry pattern.** Every check is a self-contained module of an identical
shape, listed in [`server/checks/index.js`](server/checks/index.js). The runner
loads and executes whatever's registered; the scorer and dashboard are layer-generic.
**Adding Layers 2 & 3 required zero engine changes** — only new modules + registry
entries. This is the interview headline.

```
check module: { id, layer, label, severity, run(ctx) -> { status, confidence, severity, findings } }
  status:     pass | warn | fail | na | error
  confidence: verified | detected | manual
  severity:   critical(40) | high(25) | medium(15) | low(10)
```

`ctx` helpers (built once per scan in [`lib/fileTree.js`](server/lib/fileTree.js)):
`readFile`, `fileExists`, `glob(pattern)`, `allFiles`, `manifest`, `deps`,
`sourceFiles()`, `grep(regex[, files])`, `hasDep(...names)`.

### Scoring model (transparent by design)
- Score = `earned / totalWeight * 100`; `pass`=full weight, `warn`=half, `fail`=0.
- `manual` / `na` checks are **excluded** from the score (can't verify → can't score).
- Grades: A≥90, B≥80, C≥70, D≥60, else F.
- Report includes a `scoring` "why this score" breakdown.

### Two honesty mechanisms (added beyond the original spec)
1. **Not-applicable layers.** [`lib/detect.js`](server/lib/detect.js) `hasBackend`/
   `hasDatabase` decide if a repo even has that surface. If not, every check returns
   `na`, and the scorer marks the layer `notApplicable: true` (weight 0, excluded
   from overall). A frontend-only lib isn't punished for "no rate limiting."
2. **Manual checklist.** [`database/manualChecklist.js`](server/checks/database/manualChecklist.js)
   emits a `checklist[]` (encryption-at-rest, backups, least-privilege user, PITR).
   The scorer *lifts* it off the carrier check onto `layer.manualChecklist` and the
   layer renders it as an amber "confirm these yourself" panel — never a green check,
   never scored. Layer flagged `verifiable: true` → UI shows "verifiable posture".

## 4. Layout / key files

```
server/
  config.js                 # port, GITHUB_TOKEN, ALLOWED_ORIGINS, size cap, timeout, maxConcurrentScans, rateLimit, trustProxy, ignore lists, severity weights
  index.js                  # express app; trust-proxy; GET /health, /api routes; 400/413 JSON-body handling; listen guarded for tests
  routes/scan.js            # POST /scan behind per-IP rate limiter + concurrency limiter
  controllers/scanController.js   # postScan + parseRepoInput (exported for tests)
  services/
    repoFetcher.js          # Octokit resolve + codeload tarball + tar extract + cleanup; size/timeout guards
    scanRunner.js           # builds ctx, runs ALL checks (async-capable), groups by layer, error-isolated
    scorer.js               # weighting, grades, checklist-lifting, notApplicable roll-up
  lib/
    fileTree.js             # buildContext + glob->regex + grep/deps helpers
    secretPatterns.js       # 17 gitleaks-referenced regex rules + placeholder suppression
    detect.js               # hasBackend / hasDatabase / notApplicable
    osvClient.js            # parseNpmLock + queryOsv (osv.dev batch API, guarded)
    concurrencyLimiter.js   # in-memory in-flight cap middleware (DoS guard)
    rateLimiter.js          # per-IP fixed-window rate limit middleware (injectable clock, unref'd sweep)
  checks/
    index.js                # THE REGISTRY (checks[] + layers[])
    frontend/  secretsExposed, clientSecretExposure, typeSafety, inputValidation, routeProtection
    backend/   authPresent, passwordHashing, authzChecks, rateLimiting, securityHeaders, corsConfig, logging, vulnerableDeps
    database/  dbCredentials, encryptionInTransit, querySafety, fieldEncryption, schemaValidation, manualChecklist
    shared/    depPresence
  test/                     # *.test.js + helpers.js (makeFixture writes a temp repo, runs REAL checks)

client/
  vite.config.js            # proxy /api + /health -> :4000; Vitest include/exclude
  src/
    pages/Dashboard.jsx     # layout, KPI stat-tile row, two-column + side panel
    hooks/useScan.js        # TanStack Query mutation
    services/api.js
    components/  RepoInput, ScoreGauge, StatTile, LayerSection, FindingCard,
                 ConfidenceBadge, SidePanel (animations), ManualChecklist
    index.css               # light theme tokens + animation keyframes (respects prefers-reduced-motion)
```

## 5. How to run & test

```bash
# API
cd server && npm install && npm start        # :4000
#   optional: export GITHUB_TOKEN=ghp_xxx  (60 -> 5000 req/hr)
# Dashboard
cd client && npm install && npm run dev       # :5173, open this
# Tests
cd server && npm test
cd client && npm test
cd client && npm run test:e2e
cd client && npm run build
```

Good demo repos: `gothinkster/node-express-realworld-example-app` (full stack, shows
all 3 layers + OSV vuln hits + checklist), `sindresorhus/slugify` (frontend-only →
Backend/Database render "Not applicable").

## 6. Design decisions to preserve (don't "fix" these)

- **Semantic pass/warn/fail colors stay red/amber/green** even in the green reskin.
  A security tool hiding a critical finding behind a pretty tile would betray the
  whole thesis. Green is chrome; danger reads as danger.
- **No database / no persistence.** A scan is a pure function (repo in → report out).
  Mongo scan-history is intentionally deferred, not forgotten.
- **`manual` items never affect the numeric score.** Scoring the unverifiable would
  be dishonest — that's the product's entire personality.
- **Tests use real fixtures, not mocks.** `makeFixture` writes files to a temp dir
  and runs the actual check + fileTree over them.
- **OSV check must degrade gracefully.** No lockfile / offline / rate-limited → `na`,
  never a thrown error or a blocked scan (it has its own 8s abort).

## 7. Known limitations / gotchas

- **Public repos only** (unauthenticated GitHub = 60 req/hr without a token).
- **Regex-based detection** for backend/database usage — deliberately reported as
  `detected`, not `verified`. AST parsing (`@babel/parser`) is the planned confidence
  upgrade but is optional.
- **Repo size cap** (~60 MB) and **60s scan timeout** in `config.js`; huge repos are rejected.
- OSV check needs a committed `package-lock.json` (needs exact versions); yarn/pnpm
  lockfiles are not yet parsed.
- Playwright covers a deterministic dashboard smoke path in desktop and mobile
  Chromium with the scan API mocked.
- **Rate limit & concurrency cap are per-process / in-memory** (`config.rateLimit`,
  `config.maxConcurrentScans`). Fine for a single instance; a multi-instance deploy
  would need a shared store (Redis) so limits are global, not per-replica.
- Rate limiting keys off `req.ip`. Behind a proxy/load balancer set `TRUST_PROXY=true`
  **and** ensure the proxy sets a trustworthy `X-Forwarded-For`, or all clients look
  like one IP (and share one bucket).

## 8. Next steps (roughly prioritized)

1. **AST upgrade** (`lib/astHelpers.js`) — raise backend Tier-2 checks from `detected`
   toward `verified` (e.g. confirm `app.use(rateLimit())` is actually mounted).
2. **Yarn/pnpm lockfile parsing** in `osvClient.js` to broaden the OSV check.
3. **Mongo scan-history** (optional): `scans` collection + `GET /api/scans/:id` + a history view.
4. **Deployment pass** (Docker / a host) — currently local-only.
5. **Cosmetic:** the reference's city-skyline illustration at the bottom of the side panel.

## 9. Reference docs in-conversation
The Layer 1 build reference and the Layers 2 & 3 build reference were provided as
prompts (not committed). Their intent is captured here and in `README.md`.
