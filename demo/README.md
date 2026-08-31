# OpenGravity — Demo interactiva (GitHub Pages)

Demo 100% estática del motor de due diligence bayesiano OpenGravity, publicada en:

**https://alicelabsllc.github.io/OpenGravity/**

## Qué corre en el navegador

1. **Motor bayesiano** — port exacto de `scoring.py` (`src/lib/opengravity.ts`):
   prior logit −1.386, coeficientes 0.70/2.50/0.50/3.0, penalización por burn,
   IC ±5% auditado / ±15% inferido, Monte Carlo n=1500 (mulberry32 + Box-Muller).
2. **Escuadrón agéntico** (`src/lib/agents-static.ts`) — reconstrucción de los
   harvesters archivados + `DeerFlowDispatcher` (`archive/scripts/v10_orchestrator.py`)
   en modo estático:
   - **Layer 1 · 6 vectores de investigación** solo con el nombre de la startup:
     financiación, noticias, riesgos, producto/tracción, comunidad técnica y
     fundadores/equipo, rastreando fuentes públicas abiertas con CORS abierto
     y sin claves: **Wikipedia, Wikidata, GitHub, Hacker News (Algolia), DuckDuckGo**.
   - **Layer 2 · auditor heurístico** — el mismo extractor keyword-based del
     orquestador original (con sus impactos logit: fraude −4.0, quiebra −4.5,
     despidos −2.2, reguladores −2.8, rondas +1.8, IPO +2.0) más señales
     estructuradas (estrellas GitHub, sentimiento HN, fundadores en Wikidata)
     y el guardián de veto `POLICY_FATAL_VETO`.
   - **Layer 3** — las señales se suman al logit y el motor re-puntúa en vivo;
     todo queda editable a mano (la vía manual del cliente siempre está abierta).

> En producción, el Oracle FastAPI corre este mismo pipeline con búsqueda web
> premium (Tavily) y auditor LLM (Cerebras + instructor), como en
> `archive/scripts/v10_orchestrator.py`.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000/OpenGravity/
npm run build      # export estático en out/ (basePath /OpenGravity)
```

El despliegue a GitHub Pages es automático: `.github/workflows/deploy-demo.yml`
compila este directorio y publica `out/` en cada push a `main` que toque `demo/**`.
