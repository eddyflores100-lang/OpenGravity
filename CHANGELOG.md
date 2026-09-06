# Changelog

All notable changes are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com); versioning is `MAJOR.MINOR.PATCH` starting at the V10 calibration line.

## [13.0.0] — 2026-09-06

### Added — Oráculo v13: evidencia primaria (scraping del sitio verificado) + triangulación científica + circuit breaker 🕸️
- **Migración de repo:** `alicelabsllc` dejó de existir en GitHub (404 sin
  auth — cuenta eliminada/suspendida). Proyecto re-creado en
  `eddyflores100-lang/OpenGravity` con historial completo; demo desplegada en
  `https://eddyflores100-lang.github.io/OpenGravity/` vía rama `gh-pages`
  (Pages legacy por branch, independiente de Actions). Todas las referencias
  actualizadas (README×2, LICENSE contacto, CONTRIBUTING, demo). El nombre
  legal AliceLabs LLC se conserva como titular de la licencia.
- **Vector `sitio` — scraping propio del sitio VERIFICADO:** el oráculo ya no
  solo busca el nombre en internet — DESCARGA las subpáginas canónicas del
  sitio verificado por contenido (about · contacto · equipo · blog) vía lector
  y extrae evidencia primaria: correos de contacto del propio dominio,
  personas con cargo (equipo real), clientes/partners declarados, redes
  oficiales y **feed RSS/Atom** con las últimas entradas del blog. Regla de
  identidad intacta: sin sitio verificado no hay scraping — cero datos de
  homónimos. Presupuesto por profundidad (3/4/6 subpáginas).
- **Triangulación científica en DOS bases independientes:** CrossRef (registro
  oficial de DOI de las editoriales) junto a OpenAlex — si ambas registran
  producción de la entidad, el dossier lo marca con el mismo criterio de
  corroboración usado con dominios. Nuevo registro organizacional **ROR**
  (OpenAlex institutions): país, trabajos indexados y citas acumuladas.
- **Circuit breaker por conector (`net.ts`):** 3 fallos consecutivos en la
  misma misión abren el breaker — el conector deja de gastar presupuesto de
  red (falla en <1ms, aparece como bloqueado en el panel con su motivo) y el
  resto de la misión sigue. Se resetea con el ledger en cada misión.
- **Validación de forma de respuesta:** los conectores JSON pueden declarar
  `shape()` — una respuesta 200 con estructura inesperada (p.ej. página de
  error HTML) NO entra a señales: se registra "respuesta no reconocida" sin
  reintentos. Fiabilidad: se valida lo que se espera ANTES de usarlo.
- **Export v4 (`opengravity-intel-dossier/v4`):** añade bloques `site_scrape`
  (sitio verificado, páginas escaneadas, hallazgos, entradas del blog) y
  `science` (papers por base, acuerdo entre bases independientes, registro
  ROR, ensayos) + metodología ampliada.
- **Sección 0-C del dossier:** "Evidencia primaria — scraping directo del sitio
  verificado y triangulación científica" (hallazgos por tipo con enlace a la
  subpágina real, feed del blog, corroboración científica, registro ROR);
  bloque 0-E equivalente en el export Markdown.
- **Nuevas señales estructurales al logit:** triangulación científica (+0.4),
  registro ROR (+0.3), contacto verificable en el dominio (+0.2), equipo real
  declarado (+0.3), blog vivo (+0.2), clientes declarados (+0.3).
- **Vectores:** 18 → **19** (núcleo "rápida" 15 → 16 con el scraper del sitio).

### Verificación empírica (sondas CORS, commit v13)
- `registry.npmjs.org` ✓ `*` · `api.npmjs.org` ✓ `*` · `pypi.org` ✓ `*` ·
  `api.openalex.org` ✓ `*` (works+institutions) · `api.crossref.org` ✓ `*` ·
  `boards-api.greenhouse.io` ✓ `*` · `api.lever.co` ✓ `*` · SEC efts ✗ 403 sin
  CORS (se queda vía lector/.gov existente) · archive.org ✗ timeout (descartado).

## [12.0.0] — 2026-09-06

### Added — Oráculo v12: fiabilidad medible + conectores ampliados 🔭
- **Capa de red fiable (`lib/net.ts`):** ledger de salud por consulta (estado,
  latencia, URL real, vía y timestamp ISO), reintentos con backoff exponencial
  y jitter sobre 401/403/429/5xx, semáforo de concurrencia para el lector.
  Caso real medido: el 401 transitorio "bad IP reputation" de r.jina.ai
  responde 200 al reintento — sin reintento la misión perdía fuentes.
- **DoH DUAL:** Cloudflare primero y Google (`dns.google/resolve`, CORS ✓)
  como respaldo en la sonda de dominios y el scout de identidad — un
  proveedor caído ya no produce falsos "sin DNS".
- **Panel "Fuentes consultadas — cadena de custodia":** en vivo durante la
  misión; cada consulta real con su URL, latencia, hora UTC y resultado
  (verde con datos · ámbar 0 honesto · rojo bloqueada/error), fallos incluidos.
- **Vector enciclopedia (Wikipedia + Wikidata):** búsqueda es/en, extracto,
  enlaces externos del artículo y **P856 de Wikidata** (sitio oficial
  declarado). Si coincide con el sitio verificado por OG-Scout → identidad
  **triple-verificada** (contenido + circular + enciclopedia); si difiere,
  conflicto documentado, no promediado.
- **Vector Hacker News (Algolia, CORS ✓):** historias + puntos + comentarios
  reales; tracción técnica cuantificable.
- **Reddit nativo vía PullPush:** archivo público con API JSON (fallback al
  vector DDG existente); degradación honesta donde la red lo bloquea (403
  documentado desde datacenter).
- **Vector archivo (Wayback + Certificate Transparency):** años con capturas
  (CDX colapsado por año), último snapshot visitable y subdominios reales de
  los logs públicos de TLS (crt.sh vía lector) — infraestructura real contra
  "LLC de papel".
- **Vector noticias globales:** Google News RSS (lector) + GDELT DOC 2.0 con
  reintento y respaldo por lector (geobloqueo documentado).
- **Vector paquetes (crates.io):** distribución en el ecosistema Rust.
- **Profundidad de misión (rápida / estándar / profunda):** presupuesto de
  red escalonado (6/8/10 homepages en la sonda) y en "profunda" la **segunda
  ola**: la misión se re-planea con lo verificado y lanza consultas de
  seguimiento por ángulos de analista (financiación, riesgo, producto,
  clientes + site: del sitio verificado), cada una contada en el informe.
- **Línea de tiempo verificable (sección 0-B):** cronología fusionada de
  eventos fechados — RDAP, certificados, Wayback, GitHub, HN, Reddit, prensa —
  cada evento con su URL de fuente.
- **Badge RQI en el resumen del auditor** con nº de afirmaciones corroboradas.
- **Export JSON v3** (`opengravity-intel-dossier/v3`): añade profundidad,
  enciclopedia, línea de tiempo, segunda ola y `sources_consulted` con
  timestamps; Markdown con secciones 0-B/0-C/0-D.

### Changed
- Reddit/X/GitHub/buscardores: reintento con backoff en el lector; logs de
  sub-fuente con `at` (timestamp ISO) para cadena de custodia.
- `probeDomains` acepta presupuesto de contenido por profundidad.

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
