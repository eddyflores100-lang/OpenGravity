# Changelog

All notable changes to OpenGravity are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com); versioning is `MAJOR.MINOR.PATCH` starting at the V10 calibration line.

## [10.5.0] — 2026-08-31

### Security 🔴→✅
- **Removed hardcoded API keys** (Cerebras, DeepSeek) that leaked into the
  public repository in `war_room.py`, `war_room_final.py` and
  `verify_deepseek.py`. All secrets now load from environment variables and
  fail fast with clear errors. *All exposed credentials must be rotated —
  deleting them from code does not un-leak them.*
- Gemini API key moved **out of the URL query string** into the
  `x-goog-api-key` header (prevents key leakage into logs/proxies).
- Replaced `execSync`+`curl` LLM calls with native `fetch` — removes the
  shell-injection surface and the event-loop blocking.
- CORS: wildcard origins can no longer be combined with
  `allow_credentials=True` (CORS spec violation); origins configurable via
  `CORS_ORIGINS`.

### Fixed
- **docker-compose.yml**: UI build context pointed to non-existent
  `./open-gravity-ui` → now `./ui`; added the missing Oracle (FastAPI) service;
  added `ui/Dockerfile` (multi-stage Next.js) and `Dockerfile.oracle`.
- **Conversation history sent to LLMs was reversed** (newest-first) and
  *unbounded* — `orderBy()`/`limit()` were no-op stubs. The storage layer now
  executes real `where`/`orderBy`/`limit` queries; history is truly
  chronological and capped at 10 turns.
- Telegram replies longer than 4096 chars crashed the handler → long replies
  are now split on line boundaries.
- `EVALUATIONS` store: keyed by UUID `evaluation_id` (name collisions
  impossible), bounded at 1000 entries (no more unbounded memory growth), with
  `GET /evaluations/{id}` for state polling.
- Numerically stable sigmoid in `scoring.py` — heavy negative agentic bias no
  longer risks `OverflowError` in `math.exp`.
- Pydantic v2 syntax (`min_length`/`max_length`), timezone-aware timestamps,
  placeholder-token auth check in the bot, global grammy error handler, graceful
  SIGINT/SIGTERM shutdown.

### Changed
- **Removed dead code:** `src/memory/memory.ts` (unused SQLite layer) and the
  `better-sqlite3` dependency (removes native compilation from Docker builds —
  images build ~10x faster). `groq-sdk` (unused) also removed; `undici` added
  for proxy-aware fetch.
- **Repository restructured:** 130+ experiment scripts, datasets and reports
  moved from the root into `archive/{scripts,data,reports}` (frozen, see
  `archive/README.md`). Root now contains only the production system.
- `.env.example` extended (DEEPSEEK_API_KEY, CORS_ORIGINS, PUBLIC_BASE_URL,
  NEXT_PUBLIC_API_URL).
- UI dashboard reads the Oracle URL from `NEXT_PUBLIC_API_URL` instead of a
  hardcoded localhost, and shows a visible error banner on API failure.

### Added
- `tests/test_scoring.py` — 12 regression tests locking calibration behaviour
  (thresholds, CI bounds, stable sigmoid, CRITICAL flag).
- GitHub Actions CI (backend tests + core typecheck).
- `README.md` (EN) + `README.es.md` (ES), `LICENSE` (AliceLabs Proprietary),
  `CONTRIBUTING.md`, `CHANGELOG.md`, `archive/README.md`.
- `docs/ESTRATEGIA_COMERCIALIZACION.md` and `docs/PLAYBOOK_GITHUB_STARS.md`.

## [10.4.0] — 2026-04 (initial public release)
- Bayesian + Monte Carlo + Agentic AI VC scoring engine.
- Truth Monolith v9.7.1 calibration (LOOCV, fraud-case exclusion, Brier
  scoring), 100-case historical validation.
- Telegram bot core, Institutional Dashboard, DeerFlow agent dispatch.
