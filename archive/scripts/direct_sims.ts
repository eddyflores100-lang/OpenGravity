import { MasterPipeline } from './open-gravity-ui/src/lib/master_pipeline.ts';
import { db } from './open-gravity-ui/src/lib/firebase_admin.ts';
import fs from 'fs';
import path from 'path';

async function run() {
    console.log(">>> Starting Native Execution for Historical Companies...");
    // 20 Historical Businesses
    const baseCompanies = [
      { name: "Juicero", idea: "Máquina de $400 conectada a internet que exprime bolsas pre-empaquetadas de frutas de $8. Ingresos por hardware inicial y venta recurrente de packs.", margin: 0.2, cac: 50, cash: 120000000, market: 5000000 },
      { name: "MoviePass", idea: "Suscripción B2C para ir al cine todos los días por $9.95 al mes, subsidiando entradas de $15. Monetización de datos como secundaria.", margin: -0.5, cac: 20, cash: 50000000, market: 15000000 },
      { name: "Uber_2010", idea: "Marketplace de transporte on-demand conectando conductores privados con pasajeros vía app, cobrando ~20% de take rate.", margin: 0.2, cac: 15, cash: 10000000, market: 100000000 }
    ];

    const resultsDir = path.join(process.cwd(), 'scratch/simulation_results');
    if(!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, {recursive: true});

    for(const company of baseCompanies) {
        console.log(`[>>] Simulating: ${company.name}`);
        try {
            const report = await MasterPipeline.run({
                jobId: `Direct_${company.name}_1`,
                seed: "1234abcd",
                idea: company.idea,
                financials: {
                    cac: company.cac,
                    monthly_burn: 450000,
                    initial_cash: company.cash,
                    market_size: company.market,
                    gross_margin: company.margin
                },
                context: { specialization: "general" }
            });
            fs.writeFileSync(path.join(resultsDir, `${company.name}_direct.json`), JSON.stringify(report, null, 2));
            console.log(`  --> DONE. Score: ${report.aiAnalysis.viabilityScore}`);
        } catch(e) {
            console.error(`  --> FAILED: ${e.message}`);
        }
    }
}
run();
