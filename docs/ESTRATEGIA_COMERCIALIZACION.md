# 💰 OpenGravity — Estrategia de Comercialización

> Documento interno AliceLabs · V1.0 · Agosto 2026
> Objetivo: convertir el motor de scoring V10.5 en 4 fuentes de ingreso
> escalonadas, aprovechando lo que ya está construido (oráculo, agentes,
> dashboard, bot).

---

## 0. La tesis en una frase

**Vendemos la decisión, no el modelo.** Los fondos pequeños, sindicatos,
aceleradoras y family offices no compran "machine learning": compran
*filtrar 200 deals al mes sin contratar un equipo de research*. OpenGravity
ya produce ese filtro calibrado — la estrategia es empaquetarlo para 5
compradores distintos, del más barato al más caro.

---

## 1. Las 7 vías de monetización (evaluadas y priorizadas)

### Vía A — API de pago (API-first B2B) ⭐ RECOMENDADA COMO PRIMERA

**Qué es:** exponer `POST /score` como API medible con claves y billing.
El backend FastAPI ya existe — el trabajo real es meter autenticación por
API key, rate limiting y Stripe.

**Compradores:** fintechs de lending, herramientas de CRM para VCs,
analistas individuales, hackers que construyen dashboards propios.

| Plan | Precio | Límites |
|---|---|---|
| Free | $0 | 100 calls/mes, watermark en respuesta |
| Pro | $49/mes | 5.000 calls, historial, webhooks |
| Scale | $299/mes | 50.000 calls, callbacks de agentes, soporte |

**Esfuerzo:** 🟢 Bajo (2-4 semanas). **Ingreso potencial año 1:** $15-40k MRR
si se posiciona en marketplaces (RapidAPI, API.market).

**Por qué primero:** valida disposición a pagar, genera leads para las vías
B y C, y el free tier alimenta el repositorio de GitHub (ver playbook de
estrellas — los dev vienen por el repo y se quedan por la API).

---

### Vía B — Forensic Reports como producto (productized service) ⭐ RENTA RÁPIDA

**Qué es:** vender informes de due diligence generados por el pipeline
(oráculo + agentes) con revisión humana, a precio fijo. Ya tienes el
formato: los `layered_*.json` y los reportes de auditoría del archive son
el producto, solo falta el PDF bonito y la landing.

**Compradores:** business angels sin equipo de research, sindicatos,
micro-VCs (<$50M AUM), consultoras boutique.

| Producto | Precio | Entrega |
|---|---|---|
| Quick Screen (score + CI + señales) | $149 | 24h |
| Forensic Report ( layered, con fuentes) | $499 | 72h |
| War Room (debate multi-agente + memo) | $1.499 | 1 semana |

**Esfuerzo:** 🟢 Bajo (3-4 semanas de empaquetado). **Margen:** >80% — el
costo marginal es llamadas a LLMs (~$2-8 por reporte) + 1 hora humana.

**Por qué funciona:** el mismo ángel que hoy paga $500 por un informe de
freelancer paga lo mismo por uno calibrado con intervalos de confianza —
que es algo que el freelancer no puede dar.

---

### Vía C — SaaS Dashboard multi-tenant ("OpenGravity Terminal")

**Qué es:** convertir el dashboard Next.js en producto SaaS con workspaces:
watchlists, tracking de cohortes de portafolio, alertas de down-round,
histórico de evaluaciones. Facturación mensual por asiento.

**Compradores:** analistas de fondos medianos, CVCs corporativos,
aceleradoras que necesitan evaluar sus batchs.

| Plan | Precio | Alcance |
|---|---|---|
| Solo | $99/mes | 1 usuario, 20 startups trackeadas |
| Team | $499/mes | 5 usuarios, 200 startups, agentes ilimitados |
| Fund | $1.999/mes | 25 usuarios, portafolio completo, API incluida |

**Esfuerzo:** 🟡 Medio-alto (2-3 meses: multi-tenancy, auth, billing,
persistencia Postgres). **Ticket promedio B2B:** $300-600/mes.

**Dependencia previa:** V10.6 (store persistente) — ya está en el roadmap.

---

### Vía D — White-label para aceleradoras e incubadoras

**Qué es:** licenciar el stack completo (dashboard + oráculo + agentes)
bajo marca de la aceleradora para que evalúe sus cohortes. Contrato anual
con setup fee.

**Compradores:** aceleradoras regionales (LatAm especialmente — el proyecto
ya es bilingüe ES/EN, ventaja real), programas corporativos de innovación,
fondos de gobierno.

**Precio:** $12.000-40.000/año por instancia + $2-5k de setup.

**Esfuerzo:** 🟡 Medio (branding configurable, no multi-tenant estricto).
**Ventaja competitiva:** ya tienes ES/EN nativo — casi ningún competidor de
scoring habla español de forma nativa.

---

### Vía E — Consultoría de calibración ("calibra el modelo con TU portafolio")

**Qué es:** engagement de 4-8 semanas donde calibras el motor con los datos
históricos del fondo del cliente (sus 200 deals pasados, sus aciertos y
errores) y le entregas un motor con *sus* priors. El pipeline
`train_calibrator` + Truth Monolith del archive es exactamente este servicio,
internalizado.

**Compradores:** fondos de $50-500M AUM que sospechan que sus procesos de
screening tienen sesgos pero no saben cuáles.

**Precio:** $25.000-60.000 por engagement. **Esfuerzo:** alto (es venta
consultiva, no escala sola), pero financia el desarrollo del producto core.

---

### Vía F — Data & Benchmarks licensing

**Qué es:** el dataset calibrado de 100+ casos con métricas normalizadas
(LTV/CAC, growth, runway por sector y etapa) es un activo en sí mismo.
Informe trimestral "top decile benchmarks by sector" para LPs y consultoras.

**Precio:** $2.500-10.000/año por licencia de uso interno.

**Cuidado:** revisar que el dataset no exponga información sensible antes de
licenciar; anonimizar firmas individuales.

---

### Vía G — Agente de scouting por suscripción (redes de ángeles)

**Qué es:** el bot de Telegram + `lead_sniper` ya existen. Empaquetarlos
como "deal-flow en tu bolsillo": el bot ingiere deals de un grupo de ángeles,
los pre-scorea y solo los que pasan el umbral llegan al canal.

**Precio:** $29/asiento/mes, mínimo 10 asientos por club.

**Esfuerzo:** 🟢 Bajo — es el código actual con multi-tenant ligero.

---

## 2. Matriz de decisión

| Vía | Esfuerzo | Time-to-revenue | Potencial año 1 | Escala | Orden |
|---|---|---|---|---|---|
| A. API | 🟢 Bajo | 4 semanas | $15-40k MRR | Alta | **1º** |
| B. Forensic Reports | 🟢 Bajo | 3 semanas | $3-15k MRR | Media | **2º (en paralelo)** |
| G. Bot scouting | 🟢 Bajo | 6 semanas | $1-5k MRR | Baja | 3º |
| C. Terminal SaaS | 🔴 Alto | 3 meses | $30-100k MRR | Muy alta | 4º |
| D. White-label | 🟡 Medio | 2-3 meses | $40-120k/año | Media | 5º |
| E. Calibración consultiva | 🟡 Medio | según deal | $25-60k por deal | Baja | transversal |
| F. Data licensing | 🟢 Bajo | 2 meses | $10-30k/año | Baja | 6º |

## 3. Plan de 90 días sugerido

**Semanas 1-4 — Fundaciones (V10.6)**
- [ ] Store persistente (Postgres) para evaluaciones y usuarios
- [ ] Autenticación por API key + rate limiting en el oráculo
- [ ] Stripe (o Lemon Squeezy para LatAm) con los 3 planes de la Vía A
- [ ] Landing page con demo en vivo del dashboard

**Semanas 5-8 — Dos productos al aire**
- [ ] Lanzar la API en RapidAPI + listing propio
- [ ] Empaquetar el Quick Screen ($149) y el Forensic Report ($499) —
      checkout manual al inicio (Stripe Payment Link),sin backend nuevo
- [ ] 10 entregas piloto a angels a precio de fundador a cambio de testimonio

**Semanas 9-12 — Tracción y primer white-label**
- [ ] Publicar el caso de estudio de las 10 entregas piloto
- [ ] Outbound a 30 aceleradoras LatAm con demo bilingüe (Vía D)
- [ ] Decidir con datos: ¿se invierte en el Terminal (Vía C) o se refuerza
      la API?

## 4. Posicionamiento y precios psicológicos

- **Frase ancla:** *"Bloomberg Terminal para deal sourcing, no para trading."*
- Nunca competir por precio abajo: el competidor real es el analista junior
  ($60k/año) — cualquier plan por debajo de $500/mes se vende solo contra eso.
- El free tier de la API y el repo público son el canal de adquisición, no el
  producto: acotarlos bien para no canibalizar.
- publish the calibration numbers: nadie más publica Brier scores ni ICs.
  La honestidad metodológica es el moat de marketing.

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| "¿Por qué confiar en un modelo con N=100?" | Publicar limitaciones (ya hecho) + ofrecer auditoría del histórico al cliente (Vía E) |
| Copia del repo (licencia propietaria) | El valor está en el dataset calibrado y los agentes, no en el código logístico — es público y sigue siendo difícil de replicar |
| Liability por decisión de inversión | Disclaimer en cada output + contrato que define el producto como decision-support (consultar abogado) |
| Dependencia de LLMs de terceros | El router multi-provider ya falla elegantemente; el core (scoring) corre sin LLM |
