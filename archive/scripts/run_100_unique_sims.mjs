import fs from 'fs';

const targets = [
  { name: 'Juicero', specialization: 'hardware', idea: 'Máquina exprimidora de $400 con bolsas de $15.', cac: 80, monthly_burn: 500000, initial_cash: 120000000, market_size: 5000000, gross_margin: 0.1 },
  { name: 'MoviePass', specialization: 'saas', idea: 'Suscripción B2C $9.95 mes pagando retail tickets.', cac: 10, monthly_burn: 4000000, initial_cash: 50000000, market_size: 15000000, gross_margin: -0.5 },
  { name: 'Quibi', specialization: 'saas', idea: 'Streaming premium short-form $4.99.', cac: 150, monthly_burn: 50000000, initial_cash: 1750000000, market_size: 50000000, gross_margin: 0.05 },
  { name: 'Peloton', specialization: 'hardware', idea: 'Bicicleta premium $2000 + $39 mes.', cac: 200, monthly_burn: 1000000, initial_cash: 900000000, market_size: 10000000, gross_margin: 0.4 },
  { name: 'Snapchat', specialization: 'app', idea: 'App mensajería efímera.', cac: 2, monthly_burn: 80000, initial_cash: 500000, market_size: 100000000, gross_margin: 0.9 },
  { name: 'Theranos', specialization: 'hardware', idea: 'Diagnóstico de sangre descentralizado.', cac: 50, monthly_burn: 2000000, initial_cash: 900000000, market_size: 200000000, gross_margin: 0.6 },
  { name: 'Instacart', specialization: 'ecommerce', idea: 'Grocery delivery on-demand.', cac: 40, monthly_burn: 400000, initial_cash: 8500000, market_size: 30000000, gross_margin: 0.08 },
  { name: 'Zoom', specialization: 'saas', idea: 'Videoconferencia B2B freemium.', cac: 20, monthly_burn: 100000, initial_cash: 3000000, market_size: 40000000, gross_margin: 0.8 },
  { name: 'Airbnb', specialization: 'ecommerce', idea: 'Marketplace C2C alojamientos.', cac: 15, monthly_burn: 50000, initial_cash: 600000, market_size: 15000000, gross_margin: 0.15 },
  { name: 'Dropbox', specialization: 'saas', idea: 'Cloud storage freemium B2C/B2B.', cac: 2, monthly_burn: 60000, initial_cash: 1200000, market_size: 50000000, gross_margin: 0.85 },
  { name: 'Ofo', specialization: 'hardware', idea: 'Dockless bike sharing.', cac: 5, monthly_burn: 10000000, initial_cash: 2200000000, market_size: 40000000, gross_margin: -0.1 },
  { name: 'FTX', specialization: 'quant_trading', idea: 'Crypto derivatives exchange.', cac: 100, monthly_burn: 5000000, initial_cash: 1800000000, market_size: 8000000, gross_margin: 0.9 },
  { name: 'BlueApron', specialization: 'ecommerce', idea: 'Kits comida semanal por suscripción.', cac: 120, monthly_burn: 2000000, initial_cash: 190000000, market_size: 20000000, gross_margin: 0.25 },
  { name: 'ClassPass', specialization: 'ecommerce', idea: 'Marketplace de gimnasios locales.', cac: 30, monthly_burn: 150000, initial_cash: 12000000, market_size: 5000000, gross_margin: -0.05 },
  { name: 'Fast', specialization: 'saas', idea: 'Checkout API 1-click.', cac: 500, monthly_burn: 2000000, initial_cash: 120000000, market_size: 1000000, gross_margin: 0.2 },
  { name: 'DoorDash', specialization: 'ecommerce', idea: 'Restaurant delivery logistics.', cac: 40, monthly_burn: 500000, initial_cash: 17000000, market_size: 35000000, gross_margin: 0.1 },
  { name: 'Notion', specialization: 'saas', idea: 'All in one workspace B2B.', cac: 15, monthly_burn: 70000, initial_cash: 2000000, market_size: 25000000, gross_margin: 0.95 },
  { name: 'Robinhood', specialization: 'app', idea: 'Zero-fee PFOF retail brokerage.', cac: 20, monthly_burn: 120000, initial_cash: 3000000, market_size: 20000000, gross_margin: 0.6 },
  { name: 'Rappi', specialization: 'app', idea: 'Superapp LATAM delivery multiverticulo.', cac: 25, monthly_burn: 800000, initial_cash: 10000000, market_size: 25000000, gross_margin: -0.15 },
  { name: 'Color', specialization: 'app', idea: 'App compartir fotos geolocalizadas.', cac: 50, monthly_burn: 500000, initial_cash: 41000000, market_size: 10000000, gross_margin: 0.8 },
  { name: 'WeWork', specialization: 'hardware', idea: 'Arbitraje inmobiliario espacios coworking.', cac: 200, monthly_burn: 50000000, initial_cash: 5000000000, market_size: 15000000, gross_margin: -0.2 },
  { name: 'Pets.com', specialization: 'ecommerce', idea: 'Venta online de artículos mascotas.', cac: 400, monthly_burn: 3000000, initial_cash: 82000000, market_size: 10000000, gross_margin: -0.1 },
  { name: 'Webvan', specialization: 'ecommerce', idea: 'Supermercado online infraestructura gigantesca.', cac: 150, monthly_burn: 15000000, initial_cash: 800000000, market_size: 20000000, gross_margin: 0.05 },
  { name: 'Slack', specialization: 'saas', idea: 'Chat B2B colaborativo.', cac: 25, monthly_burn: 200000, initial_cash: 5000000, market_size: 30000000, gross_margin: 0.9 },
  { name: 'Stripe', specialization: 'saas', idea: 'Pasarela de pagos API developer first.', cac: 50, monthly_burn: 150000, initial_cash: 2000000, market_size: 50000000, gross_margin: 0.9 },
  { name: 'SpaceX', specialization: 'hardware', idea: 'Cohetes reutilizables.', cac: 500000, monthly_burn: 20000000, initial_cash: 100000000, market_size: 500, gross_margin: 0.4 },
  { name: 'Uber', specialization: 'service', idea: 'Marketplace ride-hailing app.', cac: 30, monthly_burn: 1000000, initial_cash: 12000000, market_size: 100000000, gross_margin: 0.2 },
  { name: 'Jawbone', specialization: 'hardware', idea: 'Wearables fitness y audio.', cac: 100, monthly_burn: 8000000, initial_cash: 900000000, market_size: 10000000, gross_margin: 0.15 },
  { name: 'Canva', specialization: 'saas', idea: 'Software diseño gráfico freemium web.', cac: 10, monthly_burn: 100000, initial_cash: 3000000, market_size: 40000000, gross_margin: 0.88 },
  { name: 'Figma', specialization: 'saas', idea: 'Editor de vectores colaborativo B2B SaaS web.', cac: 50, monthly_burn: 300000, initial_cash: 14000000, market_size: 15000000, gross_margin: 0.92 },
  { name: 'Databricks', specialization: 'saas', idea: 'Data warehouse cloud computing lakehouse.', cac: 5000, monthly_burn: 1500000, initial_cash: 33000000, market_size: 200000, gross_margin: 0.8 },
  { name: 'Katerra', specialization: 'hardware', idea: 'Acelorar construcción mediante IA y pre-fab.', cac: 50000, monthly_burn: 30000000, initial_cash: 2000000000, market_size: 10000, gross_margin: -0.3 },
  { name: 'ZumePizza', specialization: 'hardware', idea: 'Camiones robot horneando pizzas en ruta.', cac: 40, monthly_burn: 4000000, initial_cash: 375000000, market_size: 20000000, gross_margin: 0.1 },
  { name: 'WhatsApp', specialization: 'app', idea: 'Sustituto de SMS sin anuncios $1/año.', cac: 0.1, monthly_burn: 20000, initial_cash: 250000, market_size: 1000000000, gross_margin: 0.95 },
  { name: 'Instagram', specialization: 'app', idea: 'Red social fotografía con filtros.', cac: 0.5, monthly_burn: 25000, initial_cash: 500000, market_size: 500000000, gross_margin: 0.98 },
  { name: 'Pinterest', specialization: 'app', idea: 'Tableros virtuales descubrimiento visual.', cac: 1, monthly_burn: 50000, initial_cash: 10000000, market_size: 100000000, gross_margin: 0.9 },
  { name: 'Twitter', specialization: 'app', idea: 'Microblogging público 140 caracteres.', cac: 2, monthly_burn: 400000, initial_cash: 5000000, market_size: 300000000, gross_margin: 0.8 },
  { name: 'Fab', specialization: 'ecommerce', idea: 'Ventas flash de diseño cool.', cac: 80, monthly_burn: 8000000, initial_cash: 300000000, market_size: 10000000, gross_margin: 0.15 },
  { name: 'FaradayFuture', specialization: 'hardware', idea: 'VE lujo y tecnología extrema.', cac: 10000, monthly_burn: 60000000, initial_cash: 2000000000, market_size: 100000, gross_margin: -0.4 },
  { name: 'GitHub', specialization: 'saas', idea: 'Control de versiones git alojado B2B/C.', cac: 5, monthly_burn: 30000, initial_cash: 2000000, market_size: 20000000, gross_margin: 0.9 },
  { name: 'GitLab', specialization: 'saas', idea: 'DevOps open core B2B.', cac: 200, monthly_burn: 400000, initial_cash: 20000000, market_size: 5000000, gross_margin: 0.8 },
  { name: 'MercadoLibre', specialization: 'ecommerce', idea: 'Marketplace LATAM e-commerce.', cac: 8, monthly_burn: 200000, initial_cash: 7000000, market_size: 80000000, gross_margin: 0.4 },
  { name: 'Nubank', specialization: 'app', idea: 'Banco digital LATAM sin comisiones.', cac: 15, monthly_burn: 300000, initial_cash: 14000000, market_size: 50000000, gross_margin: 0.7 },
  { name: 'FyreFestival', specialization: 'service', idea: 'Festival hiper premium en las Bahamas promocionado por influencers.', cac: 500, monthly_burn: 3000000, initial_cash: 26000000, market_size: 50000, gross_margin: -0.6 },
  { name: 'Powa', specialization: 'saas', idea: 'Soluciones pago y apps móviles B2B.', cac: 5000, monthly_burn: 10000000, initial_cash: 175000000, market_size: 50000, gross_margin: 0.1 },
  { name: 'Shopify', specialization: 'saas', idea: 'Creador de tiendas online para PYMES.', cac: 150, monthly_burn: 300000, initial_cash: 7000000, market_size: 5000000, gross_margin: 0.8 },
  { name: 'Kavak', specialization: 'ecommerce', idea: 'Venta autos usados online financiado.', cac: 300, monthly_burn: 4000000, initial_cash: 50000000, market_size: 10000000, gross_margin: 0.08 },
  { name: 'Revolut', specialization: 'app', idea: 'App financiera multi-divisa comisiones bajas.', cac: 20, monthly_burn: 250000, initial_cash: 15000000, market_size: 40000000, gross_margin: 0.65 },
  { name: 'Klarna', specialization: 'saas', idea: 'Buy Now Pay Later para ecommerce.', cac: 40, monthly_burn: 1200000, initial_cash: 50000000, market_size: 30000000, gross_margin: 0.75 },
  { name: 'Shyp', specialization: 'service', idea: 'Logística B2C enviando paquetes on-demand.', cac: 45, monthly_burn: 1000000, initial_cash: 62000000, market_size: 10000000, gross_margin: -0.1 },
  { name: 'Munchery', specialization: 'ecommerce', idea: 'Chef cocinando comidas ready-to-eat B2C.', cac: 60, monthly_burn: 2500000, initial_cash: 125000000, market_size: 5000000, gross_margin: -0.05 },
  { name: 'Secret', specialization: 'app', idea: 'Red social anónima gossiping.', cac: 3, monthly_burn: 300000, initial_cash: 35000000, market_size: 30000000, gross_margin: 0.8 },
  { name: 'Reddit', specialization: 'app', idea: 'El frente de internet foros comunitarios.', cac: 0.1, monthly_burn: 50000, initial_cash: 500000, market_size: 100000000, gross_margin: 0.8 },
  { name: 'Discord', specialization: 'app', idea: 'Chat voz gratuito para gamers.', cac: 2, monthly_burn: 80000, initial_cash: 20000000, market_size: 50000000, gross_margin: 0.85 },
  { name: 'EpicGames', specialization: 'saas', idea: 'Game engine B2B y store digital.', cac: 20, monthly_burn: 500000, initial_cash: 15000000, market_size: 200000000, gross_margin: 0.88 },
  { name: 'Vine', specialization: 'app', idea: 'Microvideos 6 segundos loops.', cac: 0.5, monthly_burn: 80000, initial_cash: 0, market_size: 50000000, gross_margin: 0.8 },
  { name: 'Hipmunk', specialization: 'saas', idea: 'Agregador de viajes diseño ágil.', cac: 30, monthly_burn: 200000, initial_cash: 55000000, market_size: 20000000, gross_margin: 0.6 },
  { name: 'Binance', specialization: 'quant_trading', idea: 'Crypto exchange y trading desk global.', cac: 20, monthly_burn: 200000, initial_cash: 15000000, market_size: 20000000, gross_margin: 0.9 },
  { name: 'Roku', specialization: 'hardware', idea: 'Cajas streaming TV ecosistema OS.', cac: 50, monthly_burn: 400000, initial_cash: 60000000, market_size: 30000000, gross_margin: 0.3 }
];

// Generar hasta 100 únicos
function expandTo100Unique(base) {
    let result = [...base];
    const techModifiers = ['AI', 'Crypto', 'VR', 'B2B', 'D2C', 'Marketplace', 'Fintech', 'Edtech', 'Proptech', 'Healthtech'];
    let idx = 0;
    while(result.length < 100) {
        let original = base[idx % base.length];
        let randTech = techModifiers[result.length % techModifiers.length];
        result.push({
            name: `${original.name}_${randTech}_${result.length}`,
            specialization: original.specialization,
            idea: `Evolución de ${original.name} enfocada en ${randTech} con IA.`,
            cac: Math.floor(original.cac * 1.5),
            monthly_burn: Math.floor(original.monthly_burn * 1.2),
            initial_cash: original.initial_cash,
            market_size: Math.floor(original.market_size * 0.8),
            gross_margin: original.gross_margin
        });
        idx++;
    }
    return result;
}

const finalTargets = expandTo100Unique(targets);

const mappedTargets = finalTargets.map(t => {
    return {
      jobId: t.name + '_Sim',
      tag: t.name,
      idea: t.idea,
      context: { specialization: t.specialization, source: "Calibration 100 Mix", skipIntake: true },
      financials: {
        cac: t.cac,
        monthly_burn: t.monthly_burn,
        initial_cash: t.initial_cash,
        market_size: t.market_size,
        gross_margin: t.gross_margin
      }
    };
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log(`>>> Preparando Lote de ${mappedTargets.length} Nuevos Casos Únicos en OpenGravity...`);
  const endpoint = "http://localhost:3000/api/predict";

  const batchSize = 4;
  for (let i = 0; i < mappedTargets.length; i += batchSize) {
    const batch = mappedTargets.slice(i, i + batchSize);
    console.log(`>>> Procesando Batch ${Math.floor(i/batchSize) + 1} (${i}-${i+batchSize})...`);
    
    await Promise.all(batch.map(async (t, j) => {
        let success = false;
        let attempts = 0;
        while(!success && attempts < 2) {
            attempts++;
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        idea: t.idea,
                        jobId: t.jobId,
                        context: t.context,
                        financials: t.financials
                    })
                });
                if(response.ok) success = true;
                else await sleep(3000);
            } catch(e) {
                await sleep(3000);
            }
        }
    }));
  }

  console.log(`>>> Las 100 inserciones han terminado.`);
}

main();
