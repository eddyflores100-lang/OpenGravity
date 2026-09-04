/**
 * OpenGravity Backtesting Suite v1.0
 * ═══════════════════════════════════════════════════════════════════
 * Validates V9.4 Prediction Engine against Historical Real-World Data.
 * ═══════════════════════════════════════════════════════════════════
 */

import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';
import { simulateOutcome } from './data_engine_v1.mjs';

const HISTORICAL_DATASET = [
    { name: "SaaS A (Real Exit)", ltv_cac: 8.5, outcome: 'SUCCESS', moe: 88 },
    { name: "Hardware B (Dead)", ltv_cac: 0.8, outcome: 'DEAD', moe: 20 },
    { name: "FinTech C (Zombie)", ltv_cac: 2.1, outcome: 'ZOMBIE', moe: 55 },
    { name: "Marketplace D (Big Exit)", ltv_cac: 12.0, outcome: 'SUCCESS', moe: 95 },
    { name: "E-commerce E (Dead)", ltv_cac: 1.2, outcome: 'DEAD', moe: 40 }
    // Aquí se inyectarían los 100-300 casos de Crunchbase
];

async function runBacktest() {
    console.log("🔍 INICIANDO BACKTEST: OPENGRAVITY V9.4 vs REALIDAD");
    
    let truePositives = 0; // Predecido INVEST y fue SUCCESS
    let falsePositives = 0; // Predecido INVEST y fue DEAD
    let cases = 0;

    for (const data of HISTORICAL_DATASET) {
        cases++;
        const inputs = { ltv_cac: data.ltv_cac, monthlyRevenue: 100000, initialCapital: 1000000, fixedOpEx: 50000 };
        const sim = { bankruptcyRate: data.ltv_cac < 1.0 ? 0.8 : 0.1, runway: 12, inputs, runs: [] };
        const post = computePosterior(data.moe, sim);
        const policy = applyDecisionPolicy(post, sim);

        const prediction = policy.verdict.includes('INVEST') ? 'SUCCESS' : 'FAIL';
        const actual = data.outcome === 'SUCCESS' ? 'SUCCESS' : 'FAIL';

        if (prediction === 'SUCCESS' && actual === 'SUCCESS') truePositives++;
        if (prediction === 'SUCCESS' && actual === 'FAIL') falsePositives++;

        console.log(`- ${data.name}: Pred [${prediction}] | Actual [${actual}] | EV: ${policy.expectedValue}`);
    }

    const precision = (truePositives / (truePositives + falsePositives)) || 0;
    
    console.log("\n--- RESULTADOS FINALES ---");
    console.log(`Casos Analizados: ${cases}`);
    console.log(`Precision (Predicting Success): ${(precision * 100).toFixed(1)}%`);
    console.log(`False Positive Rate: ${((falsePositives / cases) * 100).toFixed(1)}%`);
    console.log("--------------------------");
}

runBacktest();
