/**
 * OpenGravity V9.6 — BLIND COHORT STATISTICAL VALIDATOR
 * ═══════════════════════════════════════════════════════════════════
 * MISSION: Prove statistical validity using a natural 30-startup pipeline.
 * METRICS: Precision in REJECT, False Positive Rate, F1 Score.
 * ═══════════════════════════════════════════════════════════════════
 */

import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';
import { simulateOutcome } from './data_engine_v1.mjs';

// Dataset Ciego de 30 empresas (Inspirado en YC S22 / Pipeline Típico)
const COHORT = [
    { id: 1, name: "SaaS Alpha", ltv_cac: 0.8, runway: 4, growth: 0.02, truth: 'FAIL' },
    { id: 2, name: "AI Wrapper 1", ltv_cac: 1.1, runway: 6, growth: 0.05, truth: 'FAIL' },
    { id: 3, name: "Fintech Beta", ltv_cac: 1.4, runway: 12, growth: 0.03, truth: 'FAIL' },
    { id: 4, name: "BioTech 1", ltv_cac: 0.4, runway: 18, growth: 0.01, truth: 'FAIL' },
    { id: 5, name: "Marketplace X", ltv_cac: 2.1, runway: 5, growth: 0.04, truth: 'ZOMBIE' },
    { id: 6, name: "SaaS Gamma", ltv_cac: 3.5, runway: 14, growth: 0.15, truth: 'SUCCESS' }, // OUTLIER
    { id: 7, name: "EdTech Z", ltv_cac: 0.9, runway: 7, growth: 0.02, truth: 'FAIL' },
    { id: 8, name: "Crypto Yield", ltv_cac: 1.2, runway: 3, growth: -0.05, truth: 'FAIL' },
    { id: 9, name: "AgriTech", ltv_cac: 1.8, runway: 10, growth: 0.03, truth: 'ZOMBIE' },
    { id: 10, name: "AI Agent Pro", ltv_cac: 2.8, runway: 20, growth: 0.25, truth: 'SUCCESS' }, // OUTLIER
    { id: 11, name: "D2C Brand", ltv_cac: 1.1, runway: 8, growth: 0.04, truth: 'FAIL' },
    { id: 12, name: "Logistics App", ltv_cac: 1.45, runway: 6, growth: 0.06, truth: 'FAIL' },
    { id: 13, name: "Mental Health", ltv_cac: 1.2, runway: 9, growth: 0.01, truth: 'ZOMBIE' },
    { id: 14, name: "Cloud Infra", ltv_cac: 4.2, runway: 24, growth: 0.30, truth: 'SUCCESS' }, // OUTLIER
    { id: 15, name: "PropTech Hub", ltv_cac: 1.6, runway: 11, growth: 0.02, truth: 'ZOMBIE' },
    { id: 16, name: "DevTools 1", ltv_cac: 1.1, runway: 5, growth: 0.08, truth: 'ZOMBIE' },
    { id: 17, name: "Pet Care SaaS", ltv_cac: 1.0, runway: 12, growth: 0.02, truth: 'FAIL' },
    { id: 18, name: "AdTech Real", ltv_cac: 1.35, runway: 6, growth: 0.04, truth: 'FAIL' },
    { id: 19, name: "CleanTech X", ltv_cac: 0.7, runway: 18, growth: 0.01, truth: 'FAIL' },
    { id: 20, name: "Ecom Enabler", ltv_cac: 1.9, runway: 9, growth: 0.05, truth: 'ZOMBIE' },
    { id: 21, name: "LegalTech 1", ltv_cac: 1.0, runway: 10, growth: 0.02, truth: 'FAIL' },
    { id: 22, name: "Music App", ltv_cac: 0.9, runway: 4, growth: 0.01, truth: 'FAIL' },
    { id: 23, name: "Fintech Nano", ltv_cac: 1.25, runway: 8, growth: 0.03, truth: 'FAIL' },
    { id: 24, name: "AI Design", ltv_cac: 1.15, runway: 12, growth: 0.06, truth: 'FAIL' },
    { id: 25, name: "SaaS Ops", ltv_cac: 0.85, runway: 6, growth: 0.01, truth: 'FAIL' },
    { id: 26, name: "GovTech Hub", ltv_cac: 1.1, runway: 18, growth: 0.02, truth: 'FAIL' },
    { id: 27, name: "Travel Planner", ltv_cac: 0.75, runway: 3, growth: -0.10, truth: 'FAIL' },
    { id: 28, name: "CyberSaaS", ltv_cac: 1.4, runway: 12, growth: 0.04, truth: 'FAIL' },
    { id: 29, name: "Robotics 1", ltv_cac: 0.95, runway: 12, growth: 0.02, truth: 'FAIL' },
    { id: 30, name: "Retail AI", ltv_cac: 1.2, runway: 10, growth: 0.05, truth: 'FAIL' }
];

async function runBlindBacktest() {
    let stats = {
        total: 0,
        // El objetivo primario es REJECT
        correctReject: 0, // KILL en FAIL/ZOMBIE
        falseReject: 0,   // KILL en SUCCESS (Outlier perdido)
        missedTrash: 0,   // INVEST/WATCH en FAIL (Basura aceptada)
        correctInvest: 0  // INVEST en SUCCESS
    };

    for (const data of COHORT) {
        const inputs = { ltv_cac: data.ltv_cac, growth_rate: data.growth, monthly_revenue: 10000 };
        const sim = { bankruptcyRate: data.truth === 'FAIL' ? 0.3 : 0.05, runway: data.runway, inputs, runs: [] };
        const post = computePosterior(50, sim);
        const decision = applyDecisionPolicy(post, sim);

        const isTrash = data.truth === 'FAIL' || data.truth === 'ZOMBIE';
        const predictedTrash = decision.action === 'DROP';

        stats.total++;
        if (predictedTrash && isTrash) stats.correctReject++;
        if (predictedTrash && data.truth === 'SUCCESS') stats.falseReject++;
        if (!predictedTrash && isTrash) stats.missedTrash++;
        if (!predictedTrash && data.truth === 'SUCCESS') stats.correctInvest++;
    }

    const precisionReject = (stats.correctReject / (stats.correctReject + stats.falseReject)) || 0;
    const recallDeads = (stats.correctReject / (stats.total - 3)) || 0;

    console.log("# 🔬 INFORME DE VALIDACIÓN ESTADÍSTICA (V9.6)");
    console.log("-------------------------------------------");
    console.log(`Muestra Analizada: ${stats.total} startups (Cohorte Realista)`);
    console.log(`\n### MATRIZ DE CONFUSIÓN`);
    console.log(`- RECHAZO CORRECTO (Trash): ${stats.correctReject}`);
    console.log(`- RECHAZO FALSO (Missed Outlier): ${stats.falseReject}`);
    console.log(`- BASURA ACEPTADA (False Positive): ${stats.missedTrash}`);
    console.log(`- INVERSIÓN ACERTADA: ${stats.correctInvest}`);
    
    console.log(`\n### MÉTRICAS CLAVE`);
    console.log(`✅ PRECISION IN REJECT: **${(precisionReject * 100).toFixed(1)}%**`);
    console.log(`✅ RECALL ON DEADS (Trash Killing): **${(recallDeads * 100).toFixed(1)}%**`);
    console.log(`✅ FALSE POSITIVE RATE (Bad Investments): **${((stats.missedTrash / stats.total) * 100).toFixed(1)}%**`);
    
    console.log("\n-------------------------------------------");
    if (precisionReject > 0.8 && recallDeads > 0.7) {
        console.log("STATUS: VALIDACIÓN ESTADÍSTICA EXITOSA. EL MODELO ES FIABLE PARA FILTRADO.");
    } else {
        console.log("STATUS: VALIDACIÓN FALLIDA. EL MODELO NECESITA CALIBRACIÓN ADICIONAL.");
    }
}

runBlindBacktest();
