
const startups = [
  {
    "name": "Stripe", "year": 2010, "idea": "Infraestructura de pagos para internet.", "specialization": "saas",
    "financials": { "cac": 12, "monthly_burn": 50000, "initial_cash": 2000000, "market_size": 1000000000, "gross_margin": 0.03 }, "ground_truth": 1
  },
  {
    "name": "Zoom", "year": 2011, "idea": "Videoconferencias simplificadas y confiables.", "specialization": "saas",
    "financials": { "cac": 45, "monthly_burn": 100000, "initial_cash": 3000000, "market_size": 100000000, "gross_margin": 0.80 }, "ground_truth": 1
  },
  {
    "name": "Shopify", "year": 2006, "idea": "Plataforma para crear tiendas online fácilmente.", "specialization": "saas",
    "financials": { "cac": 120, "monthly_burn": 20000, "initial_cash": 200000, "market_size": 500000000, "gross_margin": 0.55 }, "ground_truth": 1
  },
  {
    "name": "HubSpot", "year": 2006, "idea": "Software de inbound marketing y CRM.", "specialization": "saas",
    "financials": { "cac": 1500, "monthly_burn": 300000, "initial_cash": 5000000, "market_size": 20000000, "gross_margin": 0.80 }, "ground_truth": 1
  },
  {
    "name": "Twilio", "year": 2008, "idea": "APIs para comunicaciones (SMS, Voz).", "specialization": "saas",
    "financials": { "cac": 200, "monthly_burn": 80000, "initial_cash": 1000000, "market_size": 100000000, "gross_margin": 0.50 }, "ground_truth": 1
  },
  {
    "name": "WeWork (Original)", "year": 2010, "idea": "Espacios de co-working con diseño y comunidad.", "specialization": "infrastructure",
    "financials": { "cac": 5000, "monthly_burn": 50000000, "initial_cash": 15000000, "market_size": 100000000, "gross_margin": 0.10 }, "ground_truth": 0
  },
  {
    "name": "FTX", "year": 2019, "idea": "Exchange de derivados cripto con alta liquidez.", "specialization": "saas",
    "financials": { "cac": 50, "monthly_burn": 10000000, "initial_cash": 8000000, "market_size": 1000000000, "gross_margin": 0.90 }, "ground_truth": 0
  },
  {
    "name": "Pets.com", "year": 1998, "idea": "Venta de suministros para mascotas online.", "specialization": "saas",
    "financials": { "cac": 250, "monthly_burn": 10000000, "initial_cash": 82000000, "market_size": 50000000, "gross_margin": -0.20 }, "ground_truth": 0
  },
  {
    "name": "Webvan", "year": 1996, "idea": "Entrega de comestibles a domicilio en 30 minutos.", "specialization": "saas",
    "financials": { "cac": 80, "monthly_burn": 50000000, "initial_cash": 375000000, "market_size": 10000000, "gross_margin": 0.05 }, "ground_truth": 0
  },
  {
    "name": "Kozmo.com", "year": 1998, "idea": "Entrega gratuita en 1 hora de artículos pequeños.", "specialization": "saas",
    "financials": { "cac": 15, "monthly_burn": 20000000, "initial_cash": 250000000, "market_size": 5000000, "gross_margin": -0.40 }, "ground_truth": 0
  },
  {
    "name": "Robinhood", "year": 2013, "idea": "Trading de acciones sin comisiones.", "specialization": "saas",
    "financials": { "cac": 15, "monthly_burn": 300000, "initial_cash": 3000000, "market_size": 500000000, "gross_margin": 0.40 }, "ground_truth": 1
  },
  {
    "name": "Coinbase", "year": 2012, "idea": "Forma fácil de comprar y vender Bitcoin.", "specialization": "saas",
    "financials": { "cac": 20, "monthly_burn": 150000, "initial_cash": 600000, "market_size": 1000000000, "gross_margin": 0.95 }, "ground_truth": 1
  },
  {
    "name": "Canva", "year": 2012, "idea": "Diseño gráfico democrático en la nube.", "specialization": "saas",
    "financials": { "cac": 2, "monthly_burn": 80000, "initial_cash": 3000000, "market_size": 250000000, "gross_margin": 0.85 }, "ground_truth": 1
  },
  {
    "name": "Revolut", "year": 2015, "idea": "Banca digital sin fronteras con FX barato.", "specialization": "saas",
    "financials": { "cac": 5, "monthly_burn": 1000000, "initial_cash": 2300000, "market_size": 500000000, "gross_margin": 0.20 }, "ground_truth": 1
  },
  {
    "name": "Klarna", "year": 2005, "idea": "Buy Now Pay Later para ecommerce europeo.", "specialization": "saas",
    "financials": { "cac": 10, "monthly_burn": 50000, "initial_cash": 1000000, "market_size": 100000000, "gross_margin": 0.40 }, "ground_truth": 1
  },
  {
    "name": "Snowflake", "year": 2012, "idea": "Data warehouse nativo de la nube.", "specialization": "saas",
    "financials": { "cac": 5000, "monthly_burn": 2000000, "initial_cash": 5000000, "market_size": 20000000, "gross_margin": 0.70 }, "ground_truth": 1
  },
  {
    "name": "Datadog", "year": 2010, "idea": "Monitoreo de infraestructura y logs unificado.", "specialization": "saas",
    "financials": { "cac": 1200, "monthly_burn": 100000, "initial_cash": 6200000, "market_size": 15000000, "gross_margin": 0.80 }, "ground_truth": 1
  },
  {
    "name": "MongoDB", "year": 2007, "idea": "Base de datos NoSQL escalable orientada a documentos.", "specialization": "saas",
    "financials": { "cac": 800, "monthly_burn": 500000, "initial_cash": 13400000, "market_size": 30000000, "gross_margin": 0.75 }, "ground_truth": 1
  },
  {
    "name": "Cloudflare", "year": 2009, "idea": "CDN y seguridad para cualquier sitio web.", "specialization": "saas",
    "financials": { "cac": 500, "monthly_burn": 200000, "initial_cash": 2000000, "market_size": 100000000, "gross_margin": 0.70 }, "ground_truth": 1
  },
  {
    "name": "Okta", "year": 2009, "idea": "Gestión de identidad y acceso en la nube.", "specialization": "saas",
    "financials": { "cac": 1500, "monthly_burn": 400000, "initial_cash": 10000000, "market_size": 25000000, "gross_margin": 0.75 }, "ground_truth": 1
  },
  {
    "name": "Atlassian (Jira)", "year": 2002, "idea": "Software de seguimiento de errores para desarrolladores.", "specialization": "saas",
    "financials": { "cac": 10, "monthly_burn": 1000, "initial_cash": 10000, "market_size": 5000000, "gross_margin": 0.90 }, "ground_truth": 1
  },
  {
    "name": "Tesla (Early)", "year": 2004, "idea": "Coches deportivos eléctricos de alto rendimiento (Roadster).", "specialization": "hardware",
    "financials": { "cac": 500, "monthly_burn": 3000000, "initial_cash": 6500000, "market_size": 500000, "gross_margin": 0.20 }, "ground_truth": 1
  },
  {
    "name": "SpaceX", "year": 2002, "idea": "Cohetes reutilizables para reducir costos de acceso al espacio.", "specialization": "infrastructure",
    "financials": { "cac": 1000000, "monthly_burn": 10000000, "initial_cash": 100000000, "market_size": 10000000, "gross_margin": 0.30 }, "ground_truth": 1
  },
  {
    "name": "Palantir", "year": 2003, "idea": "Análisis de Big Data para inteligencia gubernamental.", "specialization": "saas",
    "financials": { "cac": 1000000, "monthly_burn": 5000000, "initial_cash": 30000000, "market_size": 5000000, "gross_margin": 0.60 }, "ground_truth": 1
  },
  {
    "name": "Chime", "year": 2013, "idea": "Banco digital sin cargos y con adelanto de nomina.", "specialization": "saas",
    "financials": { "cac": 30, "monthly_burn": 1000000, "initial_cash": 8000000, "market_size": 100000000, "gross_margin": 0.30 }, "ground_truth": 1
  },
  {
    "name": "Plaid", "year": 2013, "idea": "API para conectar bancos con aplicaciones fintech.", "specialization": "saas",
    "financials": { "cac": 1000, "monthly_burn": 100000, "initial_cash": 2800000, "market_size": 15000000, "gross_margin": 0.70 }, "ground_truth": 1
  },
  {
    "name": "Brex", "year": 2017, "idea": "Tarjetas corporativas para startups basadas en capital.", "specialization": "saas",
    "financials": { "cac": 200, "monthly_burn": 800000, "initial_cash": 7000000, "market_size": 10000000, "gross_margin": 0.40 }, "ground_truth": 1
  },
  {
    "name": "Checkout.com", "year": 2012, "idea": "Pasarela de pagos global unificada.", "specialization": "saas",
    "financials": { "cac": 150, "monthly_burn": 50000, "initial_cash": 200000, "market_size": 800000000, "gross_margin": 0.10 }, "ground_truth": 1
  },
  {
    "name": "Gopuff", "year": 2013, "idea": "Tienda de conveniencia instantánea desde centros logísticos.", "specialization": "infrastructure",
    "financials": { "cac": 12, "monthly_burn": 1000000, "initial_cash": 3250000, "market_size": 50000000, "gross_margin": 0.25 }, "ground_truth": 1
  },
  {
    "name": "Nubank", "year": 2013, "idea": "Banco digital para américa latina sin burocracia.", "specialization": "saas",
    "financials": { "cac": 1.5, "monthly_burn": 1000000, "initial_cash": 2000000, "market_size": 200000000, "gross_margin": 0.25 }, "ground_truth": 1
  },
  {
    "name": "Airtable", "year": 2012, "idea": "Hojas de cálculo con poder de base de datos relacional.", "specialization": "saas",
    "financials": { "cac": 35, "monthly_burn": 80000, "initial_cash": 3000000, "market_size": 100000000, "gross_margin": 0.85 }, "ground_truth": 1
  },
  {
    "name": "Asana", "year": 2008, "idea": "Gestión de proyectos colaborativa para equipos modernos.", "specialization": "saas",
    "financials": { "cac": 80, "monthly_burn": 100000, "initial_cash": 1200000, "market_size": 50000000, "gross_margin": 0.85 }, "ground_truth": 1
  },
  {
    "name": "Vercel (Next.js)", "year": 2015, "idea": "Plataforma de despliegue frontend con React escalable.", "specialization": "saas",
    "financials": { "cac": 5, "monthly_burn": 50000, "initial_cash": 700000, "market_size": 20000000, "gross_margin": 0.70 }, "ground_truth": 1
  },
  {
    "name": "GitLab", "year": 2014, "idea": "DevOps lifecycle management todo-en-uno.", "specialization": "saas",
    "financials": { "cac": 200, "monthly_burn": 150000, "initial_cash": 1500000, "market_size": 15000000, "gross_margin": 0.80 }, "ground_truth": 1
  },
  {
    "name": "Snyk", "year": 2015, "idea": "Seguridad para desarrolladores integrada en el flujo de trabajo.", "specialization": "saas",
    "financials": { "cac": 450, "monthly_burn": 300000, "initial_cash": 3000000, "market_size": 20000000, "gross_margin": 0.80 }, "ground_truth": 1
  },
  {
    "name": "Docker", "year": 2013, "idea": "Contenerización de aplicaciones para portabilidad extrema.", "specialization": "saas",
    "financials": { "cac": 20, "monthly_burn": 400000, "initial_cash": 15000000, "market_size": 10000000, "gross_margin": 0.90 }, "ground_truth": 1
  },
  {
    "name": "Elastic", "year": 2012, "idea": "Motor de búsqueda y análisis distribuido.", "specialization": "saas",
    "financials": { "cac": 1000, "monthly_burn": 600000, "initial_cash": 10000000, "market_size": 15000000, "gross_margin": 0.75 }, "ground_truth": 1
  },
  {
    "name": "OpenSea", "year": 2017, "idea": "Marketplace de NFTs y coleccionables digitales.", "specialization": "saas",
    "financials": { "cac": 2, "monthly_burn": 50000, "initial_cash": 2000000, "market_size": 10000000, "gross_margin": 0.02 }, "ground_truth": 1
  },
  {
    "name": "Beanie Babies (Ty)", "year": 1993, "idea": "Peluches coleccionables con escasez artificial.", "specialization": "hardware",
    "financials": { "cac": 0.5, "monthly_burn": 100000, "initial_cash": 1000000, "market_size": 500000, "gross_margin": 0.85 }, "ground_truth": 0
  },
  {
    "name": "CueCat", "year": 2000, "idea": "Escaner de códigos de barras para conectar revistas con URLs.", "specialization": "hardware",
    "financials": { "cac": 50, "monthly_burn": 2000000, "initial_cash": 185000000, "market_size": 1000000, "gross_margin": -0.20 }, "ground_truth": 0
  },
  {
    "name": "Segway (Hyped)", "year": 2001, "idea": "Transporte personal que cambiaría el diseño de las ciudades.", "specialization": "hardware",
    "financials": { "cac": 1000, "monthly_burn": 5000000, "initial_cash": 100000000, "market_size": 5000000, "gross_margin": 0.15 }, "ground_truth": 0
  },
  {
    "name": "Fire Phone (Amazon)", "year": 2014, "idea": "Smartphone de Amazon con escaneo de productos 3D.", "specialization": "hardware",
    "financials": { "cac": 400, "monthly_burn": 100000000, "initial_cash": 500000000, "market_size": 50000000, "gross_margin": -0.10 }, "ground_truth": 0
  },
  {
    "name": "Essential Phone", "year": 2017, "idea": "Smartphone premium modular de Andy Rubin.", "specialization": "hardware",
    "financials": { "cac": 500, "monthly_burn": 10000000, "initial_cash": 300000000, "market_size": 10000000, "gross_margin": 0.05 }, "ground_truth": 0
  },
  {
    "name": "Pebble", "year": 2012, "idea": "Primer smartwatch con pantalla de tinta electrónica.", "specialization": "hardware",
    "financials": { "cac": 15, "monthly_burn": 500000, "initial_cash": 10000000, "market_size": 5000000, "gross_margin": 0.25 }, "ground_truth": 0
  },
  {
    "name": "Ouya", "year": 2012, "idea": "Consola de juegos Android de $99 abierta a todos.", "specialization": "hardware",
    "financials": { "cac": 20, "monthly_burn": 400000, "initial_cash": 8500000, "market_size": 2000000, "gross_margin": 0.10 }, "ground_truth": 0
  },
  {
    "name": "Magic Leap (Hyped)", "year": 2010, "idea": "Realidad mixta cinematográfica con proyecciones retinianas.", "specialization": "hardware",
    "financials": { "cac": 2000, "monthly_burn": 50000000, "initial_cash": 2600000000, "market_size": 5000000, "gross_margin": 0.10 }, "ground_truth": 0
  },
  {
    "name": "Better Place", "year": 2007, "idea": "Infraestructura de intercambio de baterías para coches eléctricos.", "specialization": "infrastructure",
    "financials": { "cac": 5000, "monthly_burn": 15000000, "initial_cash": 850000000, "market_size": 2000000, "gross_margin": 0.05 }, "ground_truth": 0
  },
  {
    "name": "Wirecard", "year": 1999, "idea": "Procesamiento de pagos online (con fraude masivo).", "specialization": "saas",
    "financials": { "cac": 100, "monthly_burn": 5000000, "initial_cash": 20000000, "market_size": 500000000, "gross_margin": 0.15 }, "ground_truth": 0
  },
  {
    "name": "Lordstown Motors", "year": 2018, "idea": "Pickups eléctricas para el mercado de flotas.", "specialization": "hardware",
    "financials": { "cac": 1000, "monthly_burn": 20000000, "initial_cash": 675000000, "market_size": 5000000, "gross_margin": 0.05 }, "ground_truth": 0
  },
  {
      "name": "Nikola (Claims)", "year": 2014, "idea": "Camiones de hidrógeno con cero emisiones (maqueta bajando colina).", "specialization": "hardware",
      "financials": { "cac": 50000, "monthly_burn": 30000000, "initial_cash": 700000000, "market_size": 10000000, "gross_margin": 0.10 }, "ground_truth": 0
  },
  {
      "name": "Quora", "year": 2009, "idea": "Plataforma de preguntas y respuestas de alta calidad.", "specialization": "saas",
      "financials": { "cac": 1, "monthly_burn": 600000, "initial_cash": 11000000, "market_size": 300000000, "gross_margin": 0.50 }, "ground_truth": 1
  },
  {
      "name": "Pinterest", "year": 2010, "idea": "Motor de descubrimiento visual y catálogos de ideas.", "specialization": "saas",
      "financials": { "cac": 0.5, "monthly_burn": 400000, "initial_cash": 27000000, "market_size": 400000000, "gross_margin": 0.60 }, "ground_truth": 1
  },
  {
      "name": "Snapchat", "year": 2011, "idea": "Mensajería efímera de fotos y videos.", "specialization": "saas",
      "financials": { "cac": 0.1, "monthly_burn": 100000, "initial_cash": 485000, "market_size": 500000000, "gross_margin": 0.15 }, "ground_truth": 1
  },
  {
      "name": "Instagram", "year": 2010, "idea": "Filtros para fotos y red social visual móvil.", "specialization": "saas",
      "financials": { "cac": 0.02, "monthly_burn": 20000, "initial_cash": 500000, "market_size": 1000000000, "gross_margin": 0.80 }, "ground_truth": 1
  },
  {
      "name": "Bored Ape Yacht Club", "year": 2021, "idea": "NFTs coleccionables con acceso a club exclusivo.", "specialization": "saas",
      "financials": { "cac": 1000, "monthly_burn": 500000, "initial_cash": 2000000, "market_size": 5000000, "gross_margin": 0.95 }, "ground_truth": 1
  },
  {
      "name": "Mailchimp", "year": 2001, "idea": "Marketing por email automatizado para PyMEs.", "specialization": "saas",
      "financials": { "cac": 5, "monthly_burn": 5000, "initial_cash": 200000, "market_size": 50000000, "gross_margin": 0.90 }, "ground_truth": 1
  },
  {
      "name": "Zapier", "year": 2011, "idea": "Automatización entre apps web sin código.", "specialization": "saas",
      "financials": { "cac": 2, "monthly_burn": 2000, "initial_cash": 12000, "market_size": 10000000, "gross_margin": 0.95 }, "ground_truth": 1
  },
  {
      "name": "Obsidian", "year": 2020, "idea": "Gestión de conocimiento personal basada en archivos locales.", "specialization": "saas",
      "financials": { "cac": 0.1, "monthly_burn": 5000, "initial_cash": 100000, "market_size": 10000000, "gross_margin": 0.99 }, "ground_truth": 1
  },
  {
      "name": "Vimeo", "year": 2004, "idea": "Hosting de video de alta calidad para profesionales.", "specialization": "saas",
      "financials": { "cac": 20, "monthly_burn": 100000, "initial_cash": 500000, "market_size": 20000000, "gross_margin": 0.60 }, "ground_truth": 1
  },
  {
      "name": "Shopify (IPO Era)", "year": 2015, "idea": "Sistema operativo para el comercio global.", "specialization": "saas",
      "financials": { "cac": 350, "monthly_burn": 10000000, "initial_cash": 130000000, "market_size": 1000000000, "gross_margin": 0.55 }, "ground_truth": 1
  },
  {
      "name": "Rappi", "year": 2015, "idea": "Super-app para delivery y servicios financieros en LatAm.", "specialization": "saas",
      "financials": { "cac": 15, "monthly_burn": 10000000, "initial_cash": 2000000, "market_size": 100000000, "gross_margin": 0.10 }, "ground_truth": 1
  },
  {
      "name": "Kavak", "year": 2016, "idea": "Plataforma de compra-venta de coches usados en México.", "specialization": "saas",
      "financials": { "cac": 800, "monthly_burn": 5000000, "initial_cash": 15000000, "market_size": 20000000, "gross_margin": 0.12 }, "ground_truth": 1
  },
  {
      "name": "Globant", "year": 2003, "idea": "Outsourcing de software premium con enfoque creativo.", "specialization": "saas",
      "financials": { "cac": 10000, "monthly_burn": 50000, "initial_cash": 100000, "market_size": 50000000, "gross_margin": 0.40 }, "ground_truth": 1
  },
  {
      "name": "Kushki", "year": 2017, "idea": "Procesador de pagos regional para Latino América.", "specialization": "saas",
      "financials": { "cac": 300, "monthly_burn": 100000, "initial_cash": 3000000, "market_size": 40000000, "gross_margin": 0.15 }, "ground_truth": 1
  },
  {
      "name": "Loft", "year": 2018, "idea": "Marketplace inmobiliario iBuyer en Brasil.", "specialization": "saas",
      "financials": { "cac": 1200, "monthly_burn": 2000000, "initial_cash": 18000000, "market_size": 15000000, "gross_margin": 0.08 }, "ground_truth": 1
  },
  {
      "name": "Greensill Capital", "year": 2011, "idea": "Financiación de cadena de suministro con riesgo opaco.", "specialization": "saas",
      "financials": { "cac": 5000, "monthly_burn": 10000000, "initial_cash": 100000000, "market_size": 1000000000, "gross_margin": 0.05 }, "ground_truth": 0
  },
  {
      "name": "Archegos", "year": 2013, "idea": "Family office con apalancamiento extremo y derivados.", "specialization": "saas",
      "financials": { "cac": 0, "monthly_burn": 1000000, "initial_cash": 200000000, "market_size": 50000000, "gross_margin": 1.00 }, "ground_truth": 0
  },
  {
      "name": "Boo.com", "year": 1998, "idea": "Venta de ropa deportiva de lujo online con avatar 3D.", "specialization": "saas",
      "financials": { "cac": 150, "monthly_burn": 30000000, "initial_cash": 135000000, "market_size": 20000000, "gross_margin": 0.20 }, "ground_truth": 0
  },
  {
      "name": "eToys.com", "year": 1997, "idea": "Venta de juguetes online durante el dot-com bubble.", "specialization": "saas",
      "financials": { "cac": 45, "monthly_burn": 15000000, "initial_cash": 166000000, "market_size": 30000000, "gross_margin": 0.15 }, "ground_truth": 0
  },
  {
      "name": "Kozmo.com (Legacy)", "year": 1997, "idea": "Delivery en bici de DVDs y snacks sin cargos.", "specialization": "saas",
      "financials": { "cac": 10, "monthly_burn": 10000000, "initial_cash": 250000000, "market_size": 10000000, "gross_margin": -0.50 }, "ground_truth": 0
  },
  {
      "name": "LDK Solar", "year": 2005, "idea": "Fabricación masiva de obleas de silicio solar.", "specialization": "infrastructure",
      "financials": { "cac": 500000, "monthly_burn": 50000000, "initial_cash": 480000000, "market_size": 50000000, "gross_margin": 0.05 }, "ground_truth": 0
  },
  {
      "name": "Suntech Power", "year": 2001, "idea": "Líder chino en fabricación de celdas fotovoltaicas.", "specialization": "infrastructure",
      "financials": { "cac": 800000, "monthly_burn": 60000000, "initial_cash": 300000000, "market_size": 100000000, "gross_margin": 0.10 }, "ground_truth": 0
  },
  {
      "name": "SunEdison", "year": 1959, "idea": "Desarrollador de energía renovable con deuda masiva.", "specialization": "infrastructure",
      "financials": { "cac": 1000000, "monthly_burn": 200000000, "initial_cash": 2000000000, "market_size": 500000000, "gross_margin": 0.08 }, "ground_truth": 0
  },
  {
      "name": "Evergrande", "year": 1996, "idea": "Desarrollo inmobiliario masivo en China con pre-ventas.", "specialization": "infrastructure",
      "financials": { "cac": 20000, "monthly_burn": 500000000, "initial_cash": 10000000000, "market_size": 5000000000, "gross_margin": 0.12 }, "ground_truth": 0
  },
  {
      "name": "Arrive Logistics (Growth)", "year": 2014, "idea": "Brokerage de carga digital con tecnología propietaria.", "specialization": "saas",
      "financials": { "cac": 5000, "monthly_burn": 1000000, "initial_cash": 5000000, "market_size": 80000000, "gross_margin": 0.15 }, "ground_truth": 1
  },
  {
      "name": "Flexport", "year": 2013, "idea": "Freight forwarding digital y software de logística.", "specialization": "saas",
      "financials": { "cac": 12000, "monthly_burn": 5000000, "initial_cash": 20000000, "market_size": 200000000, "gross_margin": 0.20 }, "ground_truth": 1
  },
  {
      "name": "Gorgias", "year": 2015, "idea": "Helpdesk de ecommerce enfocado en Shopify.", "specialization": "saas",
      "financials": { "cac": 800, "monthly_burn": 80000, "initial_cash": 1500000, "market_size": 10000000, "gross_margin": 0.90 }, "ground_truth": 1
  },
  {
      "name": "Klaviyo", "year": 2012, "idea": "Marketing automation basado en datos transaccionales.", "specialization": "saas",
      "financials": { "cac": 500, "monthly_burn": 100000, "initial_cash": 2000000, "market_size": 50000000, "gross_margin": 0.85 }, "ground_truth": 1
  },
  {
      "name": "Attentive", "year": 2016, "idea": "Marketing por SMS personalizado para B2C.", "specialization": "saas",
      "financials": { "cac": 1200, "monthly_burn": 1000000, "initial_cash": 13000000, "market_size": 20000000, "gross_margin": 0.75 }, "ground_truth": 1
  },
  {
      "name": "Bolt (Payments)", "year": 2014, "idea": "Ecosistema de checkout en un click.", "specialization": "saas",
      "financials": { "cac": 2000, "monthly_burn": 5000000, "initial_cash": 20000000, "market_size": 100000000, "gross_margin": 0.05 }, "ground_truth": 1
  }
];

// Add the original 20 to the list and save
const fs = require('fs');
const original = JSON.parse(fs.readFileSync('ground_truth_v1.json', 'utf8'));
const finalDataset = [...original, ...startups];

// Final deduplication and formatting
const seen = new Set();
const deduped = finalDataset.filter(s => {
  const duplicate = seen.has(s.name);
  seen.add(s.name);
  return !duplicate;
});

fs.writeFileSync('ground_truth_v1.json', JSON.stringify(deduped, null, 2));
console.log(`Total records in Ground Truth: ${deduped.length}`);
