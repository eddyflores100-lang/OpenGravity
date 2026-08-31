import fs from 'fs';
import path from 'path';

// 20 Historical Businesses
const baseCompanies = [
  { name: "Juicero", specialization: "hardware", idea: "Máquina conectada a internet que exprime bolsas pre-empaquetadas de frutas. Cobramos $400 por la máquina más una suscripción semanal de $15 por jugo.", margin: 0.2, cac: 50, cash: 120000000, market: 5000000 },
  { name: "MoviePass", specialization: "saas", idea: "Suscripción B2C para ir al cine todos los días por $9.95 al mes, pagando nosotros costo retail. El negocio está en la reventa de datos a exhibidores.", margin: -0.5, cac: 20, cash: 50000000, market: 15000000 },
  { name: "Quibi", specialization: "saas", idea: "Plataforma de streaming de videos premium con modelos de suscripción de $4.99 mensual con ads integrados para móviles.", margin: 0.1, cac: 100, cash: 1750000000, market: 50000000 },
  { name: "Peloton", specialization: "hardware", idea: "Bicicleta estática premium de $2000 con pantalla HD cobrando una suscripción de contenido de fitness por $39 al mes.", margin: 0.4, cac: 250, cash: 900000000, market: 10000000 },
  { name: "Snapchat_2012", specialization: "app", idea: "Aplicación móvil de mensajería efímera enfocada en adolescentes financiada con publicidad hiper-targeteada en video.", margin: 0.9, cac: 5, cash: 480000, market: 100000000 },
  { name: "Theranos", specialization: "hardware", idea: "Servicio de análisis de sangre B2B y B2C cobrando una fracción del precio de mercado a través de farmacias a nivel nacional.", margin: 0.6, cac: 10, cash: 900000000, market: 200000000 },
  { name: "Instacart_2013", specialization: "service", idea: "Servicio de intermediación de compra y entrega de supermercado cobrando delivery fee y markup en productos.", margin: 0.05, cac: 40, cash: 8500000, market: 30000000 },
  { name: "Zoom_2012", specialization: "saas", idea: "SaaS de software de videoconferencia B2B freemium cobrando $14.99 al mes por funciones avanzadas.", margin: 0.8, cac: 25, cash: 3000000, market: 40000000 },
  { name: "Airbnb_2009", specialization: "ecommerce", idea: "Plataforma marketplace C2C para alquiler temporal donde cobramos una comisión del 15% al anfitrión y huésped.", margin: 0.15, cac: 10, cash: 600000, market: 15000000 },
  { name: "Dropbox_2008", specialization: "saas", idea: "Carpeta mágica SaaS freemium donde cobramos $9.99 por almacenamiento superior a 2GB en la nube.", margin: 0.85, cac: 2, cash: 1200000, market: 50000000 },
  { name: "Ofo", specialization: "hardware", idea: "Alquiler dockless de bicicletas urbanas usando app, cobrando micro-pagos de $0.50 por viaje.", margin: -0.1, cac: 5, cash: 2200000000, market: 40000000 },
  { name: "FTX", specialization: "quant_trading", idea: "Exchange de derivados cripto y arbitraje B2B/B2C cobrando spreads y comisiones por transacción trading.", margin: 0.9, cac: 50, cash: 1800000000, market: 8000000 },
  { name: "BlueApron", specialization: "ecommerce", idea: "Suscripción D2C entregando kits semanales de cocina pre-medidos de $60 por receta marginando el ahorro de la cadena de suministro.", margin: 0.3, cac: 150, cash: 190000000, market: 20000000 },
  { name: "ClassPass_2014", specialization: "ecommerce", idea: "Marketplace de gimnasios locales con membresía mensual de $99, pagando al gimnasio una tarifa preferencial por huecos.", margin: -0.05, cac: 30, cash: 12000000, market: 5000000 },
  { name: "Fast", specialization: "saas", idea: "SaaS Fintech cobrando tarifa plana por la facilidad del checkout en web-stores de comercio electrónico.", margin: 0.2, cac: 1000, cash: 120000000, market: 1000000 },
  { name: "DoorDash_2014", specialization: "service", idea: "Logística y marketplace conectando restaurantes sin delivery cobrando fee de servicio al cliente del 20%.", margin: 0.08, cac: 40, cash: 17000000, market: 35000000 },
  { name: "Notion_2013", specialization: "saas", idea: "SaaS de espacio de trabajo todo en uno cobrando $8/mes usuario y tarifas empresariales para bases de dato.", margin: 0.95, cac: 15, cash: 2000000, market: 25000000 },
  { name: "Robinhood_2014", specialization: "app", idea: "App B2C de brokerage cobrando por payment for order flow de los usuarios a nivel masivo.", margin: 0.6, cac: 20, cash: 3000000, market: 20000000 },
  { name: "Rappi_2015", specialization: "app", idea: "Superapp latinoamericana cobrando suscripción Prime mensual y márgenes en microtransacciones para retail.", margin: -0.15, cac: 25, cash: 10000000, market: 25000000 },
  { name: "Color", specialization: "app", idea: "App para compartir fotos geolocalizadas, planeando monetizar con hiper-targeting en locaciones comerciales B2B.", margin: 0.8, cac: 50, cash: 41000000, market: 10000000 }
];

// Generar 100 escenarios manipulando burn rate y opEx
const targets = [];
baseCompanies.forEach(company => {
  const multipliers = [0.5, 1.0, 1.5, 2.0, 3.0]; // Variando el consumo de capital mensual fijo
  multipliers.forEach((mult, index) => {
    targets.push({
      jobId: `${company.name}_SimVariant_${index+1}`,
      tag: company.name,
      idea: company.idea + ` [Escenario Fijo Mensual x${mult}]`,
      context: { specialization: company.specialization },
      financials: {
        cac: company.cac,
        monthly_burn: 50000 * mult, // entre $25k y $500k de burn rate
        initial_cash: company.cash,
        market_size: company.market,
        gross_margin: company.margin
      }
    });
  });
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log(`>>> Preparando Lote de ${targets.length} Simulaciones en OpenGravity...`);
  const endpoint = "http://localhost:3000/api/predict";

  let i = 0;
  for (const t of targets) {
    i++;
    let success = false;
    let attempts = 0;
    
    while(!success && attempts < 3) {
      attempts++;
      console.log(`[${i}/${targets.length}] [Intento ${attempts}] Encolando Job: ${t.jobId}`);
      try {
          const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  idea: t.idea,
                  jobId: t.jobId,
                  context: { ...t.context, skipIntake: true, source: "Institutional Benchmark" },
                  financials: t.financials
              })
          });
          
          const text = await response.text();
          let resJson;
          try {
            resJson = JSON.parse(text);
          } catch(e) {
            console.error(`   --> Error parseando JSON: ${text.slice(0, 100)}...`);
            throw new Error("Invalid JSON response");
          }

          if(!response.ok) {
              console.error(`   --> Error encolando ${t.jobId}:`, resJson);
              if (response.status === 500 || response.status === 429) {
                console.log("   --> Reintentando en 5 segundos...");
                await sleep(5000);
              } else {
                break; // No reintentar si es error de validación (400, 422)
              }
          } else {
              console.log(`   --> ENCOLADO CORRECTAMENTE: ${resJson.jobId}`);
              success = true;
          }
      } catch(e) {
          console.error(`   --> Error de red encolando ${t.jobId}:`, e.message);
          await sleep(2000);
      }
    }
    // Pequeño delay entre diferentes ideas para no saturar Gemini
    await sleep(2000);
  }

  console.log(`>>> Se finalizaron los ${targets.length} requests de inserción. Los agentes están procesando en background.`);
  console.log(`Puedes revisar la colección 'audits' en Firebase para ver los resultados conforme se calculen.`);
}

main();
