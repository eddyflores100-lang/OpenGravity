/**
 * OpenGravity V8.2.1 — FINAL WAR MACHINE AUDIT
 * Uses REAL Data Engine + 100 Monte Carlo Runs per Asset
 */
import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';
import { simulateOutcome, MARKET_REGIMES } from './data_engine_v1.mjs';

const CASES = [
    { name: "Airbnb (2008)", ltv_cac: 8.5, runway: 3, rev: 5000, cap: 20000, opex: 15000, moe: 45, regime: 'LIQUIDITY_CRUNCH', type: 'HISTORICAL' },
    { name: "Fast.co (S)", ltv_cac: 0.9, runway: 12, rev: 100000, cap: 120000000, opex: 10000000, moe: 95, regime: 'BULL_HYPE', type: 'SYNTHETIC' },
    { name: "Uber (2010)", ltv_cac: 4.5, runway: 6, rev: 50000, cap: 1500000, opex: 200000, moe: 60, regime: 'NORMAL', type: 'HISTORICAL' },
    { name: "Quibi (S)", ltv_cac: 0.7, runway: 18, rev: 10000, cap: 1700000000, opex: 100000000, moe: 95, regime: 'NORMAL', type: 'SYNTHETIC' },
    { name: "Slack (Pre-IPO)", ltv_cac: 5.2, runway: 15, rev: 2000000, cap: 50000000, opex: 1000000, moe: 88, regime: 'NORMAL', type: 'HISTORICAL' },
    { name: "Zoom (Early)", ltv_cac: 12.0, runway: 10, rev: 300000, cap: 5000000, opex: 100000, moe: 70, regime: 'NORMAL', type: 'HISTORICAL' },
    { name: "Theranos (S)", ltv_cac: 0.5, runway: 24, rev: 1000, cap: 400000000, opex: 5000000, moe: 98, regime: 'BULL_HYPE', type: 'SYNTHETIC' },
    { name: "WeWork (S)", ltv_cac: 1.1, runway: 8, rev: 100000000, cap: 2000000000, opex: 500000000, moe: 90, regime: 'BEAR_MARKET', type: 'SYNTHETIC' },
    { name: "Netflix (Early)", ltv_cac: 6.0, runway: 7, rev: 200000, cap: 1000000, opex: 500000, moe: 50, regime: 'NORMAL', type: 'HISTORICAL' },
    { name: "SaaS Zombie (S)", ltv_cac: 1.5, runway: 18, rev: 45000, cap: 500000, opex: 50000, moe: 20, regime: 'NORMAL', type: 'SYNTHETIC' }
    // (Truncado a 10 para reporte conciso, aplicando misma lógica a todos)
];

console.log("# EXECUTION REPORT: V8.2.1 FINAL WAR MACHINE");
console.log("| COMPANY | VERDICT | EST. EV (MC) | ALLOC (%) | P(SUCCESS) | CLASS |");
console.log("| :--- | :--- | :--- | :--- | :--- | :--- |");

CASES.forEach(c => {
    // 1. GENERAR 100 RUNS REALES USANDO EL MOTOR V8
    const inputs = { ltv_cac: c.ltv_cac, monthlyRevenue: c.rev, initialCapital: c.cap, fixedOpEx: c.opex };
    const runs = Array.from({ length: 100 }, () => simulateOutcome(inputs, c.regime));

    // 2. AGREGAR MÉTRICAS DE SIMULACIÓN
    const bankruptcyCount = runs.filter(r => r.outcome === 0).length;
    const sim = {
        bankruptcyRate: bankruptcyCount / 100,
        runway: c.runway,
        inputs,
        runs
    };

    const post = computePosterior(c.moe, sim);
    const policy = applyDecisionPolicy(post, sim);

    console.log(`| ${c.name} | **${policy.verdict}** | ${policy.expectedValue}x | ${Math.round(policy.positionSize * 100)}% | ${(post.probabilities.success * 100).toFixed(1)}% | ${c.type} |`);
});
