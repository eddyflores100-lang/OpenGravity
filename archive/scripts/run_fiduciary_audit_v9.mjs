/**
 * OpenGravity V9 — FINAL FIDUCIARY AUDIT (FULL 20 CASES)
 */
import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';
import { simulateOutcome, MARKET_REGIMES } from './data_engine_v1.mjs';

const CASES = [
    { name: "Airbnb (2008)", ltv_cac: 8.5, runway: 3, rev: 5000, cap: 20000, opex: 15000, moe: 45, regime: 'LIQUIDITY_CRUNCH', type: 'HISTORICAL' },
    { name: "Fast.co (S)", ltv_cac: 0.9, runway: 12, rev: 100000, cap: 120000000, opex: 10000000, moe: 95, regime: 'BULL_HYPE', type: 'SYNTHETIC' },
    { name: "Uber (2010)", ltv_cac: 4.5, runway: 6, rev: 50000, cap: 1500000, opex: 200000, moe: 60, regime: 'NORMAL', type: 'HISTORICAL' },
    { name: "Slack (Pre-IPO)", ltv_cac: 5.2, runway: 15, rev: 2000000, cap: 50000000, opex: 1000000, moe: 88, regime: 'NORMAL', type: 'HISTORICAL' },
    { name: "Zoom (Early)", ltv_cac: 12.0, runway: 10, rev: 300000, cap: 5000000, opex: 100000, moe: 70, regime: 'NORMAL', type: 'HISTORICAL' },
    { name: "Theranos (S)", ltv_cac: 0.5, runway: 24, rev: 1000, cap: 400000000, opex: 5000000, moe: 98, regime: 'BULL_HYPE', type: 'SYNTHETIC' },
    { name: "Quibi (S)", ltv_cac: 0.7, runway: 18, rev: 10000, cap: 1700000000, opex: 100000000, moe: 95, regime: 'NORMAL', type: 'SYNTHETIC' },
    { name: "WeWork (S)", ltv_cac: 1.1, runway: 8, rev: 100000000, cap: 2000000000, opex: 500000000, moe: 90, regime: 'BEAR_MARKET', type: 'SYNTHETIC' },
    { name: "Netflix (Early)", ltv_cac: 6.0, runway: 7, rev: 200000, cap: 1000000, opex: 500000, moe: 50, regime: 'NORMAL', type: 'HISTORICAL' },
    { name: "SaaS Zombie (S)", ltv_cac: 1.5, runway: 18, rev: 45000, cap: 500000, opex: 50000, moe: 20, regime: 'NORMAL', type: 'SYNTHETIC' },
    { name: "AI Hype (S)", ltv_cac: 1.2, runway: 12, rev: 5000, cap: 10000000, opex: 500000, moe: 98, regime: 'BULL_HYPE', type: 'SYNTHETIC' },
    { name: "Zappos (2000)", ltv_cac: 3.5, runway: 4, rev: 12000, cap: 100000, opex: 40000, moe: 55, regime: 'NORMAL', type: 'HISTORICAL' },
    { name: "Peloton (2022)", ltv_cac: 1.8, runway: 6, rev: 150000000, cap: 500000000, opex: 200000000, moe: 30, regime: 'BEAR_MARKET', type: 'HISTORICAL' },
    { name: "Hardware Heavy (S)", ltv_cac: 2.5, runway: 5, rev: 10000, cap: 2000000, opex: 300000, moe: 65, regime: 'NORMAL', type: 'SYNTHETIC' },
    { name: "DTC CAC Trap (S)", ltv_cac: 1.05, runway: 9, rev: 250000, cap: 1000000, opex: 200000, moe: 80, regime: 'BEAR_MARKET', type: 'SYNTHETIC' },
    { name: "Cloud Kitchen (S)", ltv_cac: 1.3, runway: 12, rev: 35000, cap: 400000, opex: 30000, moe: 40, regime: 'NORMAL', type: 'SYNTHETIC' },
    { name: "FinTech RegRisk (S)", ltv_cac: 3.8, runway: 14, rev: 800000, cap: 20000000, opex: 500000, moe: 75, regime: 'LIQUIDITY_CRUNCH', type: 'SYNTHETIC' },
    { name: "Coinbase (2022)", ltv_cac: 2.1, runway: 20, rev: 50000000, cap: 2000000000, opex: 100000000, moe: 15, regime: 'BEAR_MARKET', type: 'HISTORICAL' },
    { name: "Hobby Lifestyle (S)", ltv_cac: 1.6, runway: 36, rev: 4000, cap: 50000, opex: 2000, moe: 10, regime: 'NORMAL', type: 'SYNTHETIC' },
    { name: "Logistics Tech (S)", ltv_cac: 4.2, runway: 11, rev: 80000, cap: 3000000, opex: 150000, moe: 60, regime: 'NORMAL', type: 'SYNTHETIC' }
];

async function runFiduciaryAudit() {
    console.log("# 📊 AUDITORÍA DE INTELIGENCIA FIDUCIARIA: OPEN GRAVITY V9");
    console.log("## Full Benchmark: 20 Cases / 2,000 Simulations\n");
    console.log("| EMPRESA | VERDICTO | EST. EV | ALLOC (%) | P(SUCCESS) | S-GATE |");
    console.log("| :--- | :--- | :--- | :--- | :--- | :--- |");

    for (const c of CASES) {
        const inputs = { ltv_cac: c.ltv_cac, monthlyRevenue: c.rev, initialCapital: c.cap, fixedOpEx: c.opex };
        const runs = Array.from({ length: 100 }, () => simulateOutcome(inputs, c.regime));
        const bankruptcyRate = runs.filter(r => r.outcome === 0).length / 100;
        
        const sim = { bankruptcyRate, runway: c.runway, inputs, runs };
        const post = computePosterior(c.moe, sim);
        const policy = applyDecisionPolicy(post, sim);

        const sGate = c.ltv_cac >= 1.5 ? "PASS" : "FAIL";

        console.log(`| ${c.name} | **${policy.verdict}** | ${policy.expectedValue}x | ${Math.round(policy.positionSize * 100)}% | ${(post.probabilities.success * 100).toFixed(1)}% | ${sGate} |`);
    }
}

runFiduciaryAudit();
