/**
 * OpenGravity V7.5 — Institutional Regime Benchmark
 * ═══════════════════════════════════════════════════════════════════
 * ESCENARIO: Airbnb (2008) bajo LIQUIDITY_CRUNCH vs Fast.co bajo BULL_HYPE.
 * OBJETIVO: Validar generalización exógena y Power Law EV.
 * ═══════════════════════════════════════════════════════════════════
 */

import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';

const BENCHMARK_CASES = [
    {
        name: "Airbnb 2008 (LIQUIDITY_CRUNCH Context)",
        inputs: { ltv_cac: 8.5, runway: 3.0, monthlyRevenue: 5000, initialCapital: 20000, fixedOpEx: 15000 },
        moe: 40,
        regime: 'LIQUIDITY_CRUNCH'
    },
    {
        name: "Fast.co 2021 (BULL_HYPE Context)",
        inputs: { ltv_cac: 0.9, runway: 12.0, monthlyRevenue: 100000, initialCapital: 120000000, fixedOpEx: 10000000 },
        moe: 95,
        regime: 'BULL_HYPE'
    }
];

// Mock de simulación que usa el nuevo Data Engine V7.5
function runRegimeSim(c) {
    // Simulamos la tasa de bancarrota real bajo el régimen específico
    const simulationBase = { 
        bankruptcyRate: c.regime === 'LIQUIDITY_CRUNCH' ? 0.85 : 0.1, 
        runway: c.inputs.runway,
        inputs: c.inputs,
        runs: Array(10).fill(0).map(() => ({ outcome: Math.random() > 0.6 ? 1 : 0 })) 
    };
    
    const posterior = computePosterior(c.moe, simulationBase);
    const policy = applyDecisionPolicy(posterior, simulationBase);

    console.log(`\n🕵️ ANALIZANDO: ${c.name}`);
    console.log(`   Régimen:       ${c.regime}`);
    console.log(`   P(Success):    ${(posterior.probabilities.success * 100).toFixed(1)}%`);
    console.log(`   EXPECTED VAL:  ${policy.expectedValue}x (Power Law)`);
    console.log(`   VERDICTO:      ${policy.verdict}`);
    if (policy.violations.length > 0) {
        console.log(`   VIOLACIONES:   ${policy.violations.map(v => v.name).join(', ')}`);
    }
}

console.log(`\n🚀 INICIANDO V7.5 FUND-GRADE BENCHMARK`);
BENCHMARK_CASES.forEach(runRegimeSim);
console.log(`\n✅ Fin del Benchmark.`);
