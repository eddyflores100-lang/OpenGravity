# ⭐ Playbook — Cómo Conseguir Estrellas en GitHub para OpenGravity

> Documento interno AliceLabs · V1.0 · Agosto 2026
> Meta realista: **150-500 estrellas en 90 días** con ejecución disciplinada
> (sin trucos, sin farming — eso mata repos).

---

## Principio rector

Las estrellas no se piden: **se ganan en los primeros 8 segundos** que un
visitante pasa en tu README. Cada visitante se hace dos preguntas: *¿qué es?*
y *¿por qué debería importarme en 10 segundos?* Todo este playbook existe para
ganar esas dos respuestas y luego poner el repo frente a suficientes ojos.

---

## Fase 0 — Higiene pre-lanzamiento (hecho en V10.5 ✅ / pendientes)

### Ya resuelto en esta pasada:
- ✅ README bilingüe con badges, arquitectura Mermaid, quickstart de 3 comandos
- ✅ Respuestas de ejemplo reales (curl + JSON)
- ✅ Metodología honesta publicada (limitaciones con N=100, Brier, LOOCV)
- ✅ LICENSE claro (licencias ambiguas matan estrellas)
- ✅ CHANGELOG, CONTRIBUTING, tests y CI
- ✅ Raíz limpia (10 archivos, no 156)
- ✅ Cero secretos en el código

### Pendiente antes de lanzar (checklist de 1 semana):
- [ ] **Rotar y verificar claves** — y confirmar que el escaneo de secretos de
      GitHub (Settings → Code security) está activo
- [ ] **Social preview:** Settings → General → Social preview → subir
      `.github/assets/social-card.png` (1280×640). Es la imagen que aparece en
      cada share de Twitter/LinkedIn/Telegram — es tu CTR.
- [ ] **Descripción del repo (About):** 
      `🪐 Bayesian + Agentic AI engine that scores startups with calibrated probabilities — not vibes.`
- [ ] **Topics (máx 20, cada uno es un canal de descubrimiento):**
      `bayesian-inference`, `venture-capital`, `due-diligence`, `ai-agents`,
      `monte-carlo-simulation`, `fastapi`, `nextjs`, `llm`, `fintech`,
      `scoring`, `telegram-bot`, `docker`
- [ ] **Demo GIF en el README** (30-45s: curl → respuesta JSON → dashboard con
      el status WINNER). Herramientas: `vhs` (charmbracelet) para terminal,
      Screen Studio/OBS para el dashboard. Un README con GIF convierte 2-3x mejor.
- [ ] **Release v10.5.0** con las notas del CHANGELOG (los releases aparecen
      en feeds y Google)
- [ ] **Pin del repo** en el perfil de la org + perfil personal de los devs
- [ ] **Discussions habilitado** (Q&A) — baja la fricción vs. issues

---

## Fase 1 — Contenido ancla (semana previa al lanzamiento)

Las estrellas llegan a través de **historias**, no de repos. Prepara 3 piezas:

1. **Post técnico (el principal):** *"We calibrated a Bayesian VC scorer
   against 100 startups and published our error bars"* — la honestidad
   metodológica (Theranos excluido, ±15% de CI, LOOCV) es lo que hace
   shareable esto. Publicar en dev.to + Medium + blog propio, en EN y ES.
2. **Hilo de X/Twitter (build in public):** 8-10 tweets con los gráficos del
   archive (matriz de confusión, Brier score) y el GIF de la demo. Terminar
   con el link al repo.
3. **Post de LinkedIn en español** para la audiencia LatAm (fondo:
   aceleradoras, angels) — mismo contenido, ángulo "due diligence con
   probabilidad calibrada, en español".

> 💡 Regla: cada pieza termina con UN solo CTA → el repo. No dispersar.

---

## Fase 2 — Lanzamiento (la semana D)

**Día elegido: martes, miércoles o jueves.** Nunca viernes ni fin de semana.
Mejor ventana para HN: 08:00-10:00 ET.

| Canal | Formato | Truco |
|---|---|---|
| **Hacker News** | `Show HN: OpenGravity – Bayesian + agentic AI scoring for startups` | Título sin hype, primera línea del post responde "why it exists". Responder TODOS los comentarios las primeras 6h — el algoritmo premia conversación activa |
| **Reddit** | r/SideProject, r/startups, r/venturecapital, r/EnterpriseAI | Una línea de contexto personal + link. Prohibido crosspostear lo mismo en 4 subs el mismo día (spam filters) — escalonar 48h |
| **Product Hunt** | Lanzamiento como herramienta de investigación | Preparar 3 assets de galería + maker comment contando por qué lo construiste. Un jueves, 00:01 PT |
| **X/Twitter** | Hilo + reply a accounts de "build in public" | Pedir 3-5 a conocidos que lo quoteen en la primera hora |
| **LinkedIn** | Post EN + post ES en días distintos | Taggear aceleradoras/fondos LatAm con los que ya tengas relación |
| **Newsletter submissions** | TLDR AI, Import AI, Python Weekly, Node Weekly | Formulario de cada una; los "show your project" sí aceptan |
| **Comunidades ES** | Discord/Slack de devs LatAm, comunidades de Python/FastAPI | Presentar como "lo que hice", no como anuncio |

**Durante la semana D:**
- Tiempo de respuesta a issues/comentarios: **< 4 horas**. Los primeros
  visitantes que reciben respuesta se vuelven estrellas + evangelistas.
- No pedir estrellas en el post ("leave a star if useful" dentro del README
  está bien; rogarlo en HN penaliza).

---

## Fase 3 — Mantener el momentum (semanas 2-12)

Las estrellas son un flujo, no un evento. Cadencia mínima:

1. **1 release cada 2 semanas** (V10.6 → roadmap visible). GitHub muestra el
   "latest commit" — repos muertos no ganan estrellas.
2. **Changelog público → tuitear cada release.**
3. **Responder 100% de issues < 24h** y etiquetar `good first issue` en 2-3
   tareas fáciles (traducciones, docs) — los contribuyentes repetidos
   estrellan y comparten.
4. **1 post técnico/mes** desmenuzando una parte del motor (ej: *"Why our
   sigmoid can't overflow"*, *"How we excluded Theranos from calibration"*).
   Cada post = nueva ola de tráfico al repo.
5. **Radar de preguntas:** responder threads de HN/Reddit sobre "VC deal
   screening tools" mencionando OpenGravity cuando aporte (sin spam).

---

## Fase 4 — Palancas de crecimiento compuesto

- **Badges de terceros:** cuando la API tenga usuarios, añadir badge de
  Discord/community en el README.
- **Awesome lists:** pedir inclusión en awesome-ai-agents, awesome-quant
  (la parte Monte Carlo), awesome-fastapi. Un PR por list, mensaje educado.
- **Colaboraciones:** ofrecer a 2-3 YouTubers/steamers de Python/FastAPI un
  walkthrough guiado ("tu repositorio para tu video").
- **GitHub Trends:** el algoritmo de trending premia *velocidad* de estrellas
  en 24-48h → concentrar los mejores canales en la misma ventana de
  lanzamiento, no repartirlos en 3 semanas.
- **El truco honesto más potente:** el **live demo desplegado** (Hugging Face
  Space o Fly.io free tier con el dashboard + oráculo). "Try it without
  installing" en la parte superior del README convierte curiosos en estrellas.

---

## Métricas y expectativas honestas

| Métrica | Dónde mirarla | Objetivo 90 días |
|---|---|---|
| Stars | Insights → Traffic | 150-500 |
| Visitas únicas | Insights → Traffic | 2.000-8.000 |
| Forks | repo | 30-80 |
| Conversión README→star | stars/visits | 3-6% es sano |
| Referrers top | Insights | news.ycombinator.com, reddit.com, x.com |

**Qué NO hacer (mata repos):**
- ❌ Grupos de "star for star" (GitHub detecta y penaliza el ranking)
- ❌ Comprar estrellas (los bots se purgan y te quedas sin credibilidad)
- ❌ Self-promo idéntico en 10 subreddits el mismo día
- ❌ Falsificar métricas — el repositorio entero se construyó sobre la
   honestidad metodológica; el marketing debe ser coherente con eso

---

## Checklist maestro (imprimible)

```
SEMANA -1
[ ] Claves rotadas y code scanning activo
[ ] Social preview subido
[ ] About + topics configurados
[ ] Demo GIF grabado y en README
[ ] Release v10.5.0 publicado
[ ] Post dev.to/Medium en borrador
[ ] Hilo de X en borrador
SEMANA 0 (lanzamiento)
[ ] Show HN (mar-jue 8-10 ET)
[ ] r/SideProject (día D+1)
[ ] Product Hunt (jueves siguiente)
[ ] Post LinkedIn ES (D+2)
[ ] Newsletter submissions
[ ] Respuestas < 4h en todos los canales
SEMANAS 2-12
[ ] Release quincenal + tuit
[ ] 1 post técnico/mes
[ ] Issues < 24h + good first issues
[ ] Awesome lists PRs
[ ] Live demo desplegado
```
