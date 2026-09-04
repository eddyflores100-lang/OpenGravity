# Changelog

All notable changes to OpenGravity are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com); versioning is `MAJOR.MINOR.PATCH` starting at the V10 calibration line.

## [11.0.0] — 2026-09-04

### Added — OG-Oracle: motor de inteligencia algorítmica ✨
- **Dossier de Inteligencia (sección 00 del informe):** la evidencia verificada
  se agrupa en afirmaciones temáticas (contratación, financiación, producto,
  riesgo, comunidad, mercado, regulación) y se **triangula**: una afirmación es
  `CORROBORADA` cuando ≥2 dominios independientes la reportan; con una sola
  fuente queda `NO CONFIRMADA`. Cobertura mixta (+ y − a la vez) se declara
  sin promediar.
- **RQI — Research Quality Index (0-100, determinista y auditable):**
  cobertura de vectores 30 · solidez de identidad 25 · triangulación 25 ·
  frescura 15 · registro oficial 5. Desglose visible en la UI y en el export.
- **Brechas de cobertura honestas:** lo que NO se encontró se lista (vectores
  vacíos/fallidos, métricas ausentes, identidad sin cerrar).
- **Export JSON v2 (`opengravity-intel-dossier/v2`):** misión completa con
  afirmaciones + fuentes + URL + fechas, resolución de identidad (candidatos,
  homónimos, estados), RQI desglosado, señales del auditor y registro .gov.
- **Nuevo conector: Stack Exchange API** (CORS nativo, cuota anónima honesta
  con degradación visible) — presencia técnica Q&A de la entidad.
- Dominio declarado sin verificación de contenido disponible (lector
  saturado) se atribuye **por declaración**, dicho explícitamente — un
  homónimo jamás se atribuye por silencio.

### Fixed — identidad digital: existencia ≠ propiedad
- La sonda DNS multi-TLD ya no presenta "resuelve" como propiedad: cada
  dominio vivo se descarga y se clasifica con evidencia (`verificado`,
  `homónimo`, `en venta/parking`, `sin relación`, `caído`, `libre`).
- Caso real corregido: `alicelabs.ai` (consultora sueca homónima) se cita con
  su título real; `alicelabs.com` en venta; el sitio del usuario
  `www.alicelabs.site` se verifica por contenido y fallback `www` cuando el
  apex está aparcado.
- Cuentas GitHub: el parecido del login ya no confirma identidad — estados
  `declarada / circular / contenido / sin-verificar`; bajo rate-limit (403)
  se listan sin atribuir.

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
