/**
 * OpenGravity V8.2 — Institutional defense Benchmark
 * 20 cases (Historical & Synthetic)
 */
import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';

const CASES = [
    // HISTORICAL DATASET
    { name: "Airbnb (2008)", ltv_cac: 8.5, b_rate: 0.75, runway: 3, moe: 45, type: 'HISTORICAL' },
    { name: "Uber (2010)", ltv_cac: 4.5, b_rate: 0.15, runway: 6, moe: 60, type: 'HISTORICAL' },
    { name: "Slack (Pre-IPO)", ltv_cac: 5.2, b_rate: 0.05, runway: 15, moe: 88, type: 'HISTORICAL' },
    { name: "Zoom (Early)", ltv_cac: 12.0, b_rate: 0.05, runway: 10, moe: 70, type: 'HISTORICAL' },
    { name: "Netflix (Early)", ltv_cac: 6.0, b_rate: 0.15, runway: 7, moe: 50, type: 'HISTORICAL' },
    { name: "Peloton (2022)", ltv_cac: 1.8, b_rate: 0.45, runway: 6, moe: 30, type: 'HISTORICAL' },
    { name: "Coinbase (2022)", ltv_cac: 2.1, b_rate: 0.45, runway: 20, moe: 15, type: 'HISTORICAL' },
    { name: "Zappos (2000)", ltv_cac: 3.5, b_rate: 0.15, runway: 4, moe: 55, type: 'HISTORICAL' },
    
    // SYNTHETIC ARCHETYPES (Stress Testing)
    { name: "Fast.co (S)", ltv_cac: 0.9, b_rate: 0.10, runway: 12, moe: 95, type: 'SYNTHETIC' },
    { name: "Quibi (S)", ltv_cac: 0.7, b_rate: 0.10, runway: 18, moe: 95, type: 'SYNTHETIC' },
    { name: "Theranos (S)", ltv_cac: 0.5, b_rate: 0.05, runway: 24, moe: 98, type: 'SYNTHETIC' },
    { name: "WeWork (S)", ltv_cac: 1.1, b_rate: 0.45, runway: 8, moe: 90, type: 'SYNTHETIC' },
    { name: "AI Hype (S)", ltv_cac: 1.2, b_rate: 0.10, runway: 12, moe: 98, type: 'SYNTHETIC' },
    { name: "DTC CAC Trap (S)", ltv_cac: 1.05, b_rate: 0.45, runway: 9, moe: 80, type: 'SYNTHETIC' },
    { name: "Zombie SaaS (S)", ltv_cac: 1.5, b_rate: 0.15, runway: 18, moe: 20, type: 'SYNTHETIC' },
    { name: "Hardware Heavy (S)", ltv_cac: 2.5, b_rate: 0.15, runway: 5, moe: 65, type: 'SYNTHETIC' },
    { name: "Hobby Lifestyle (S)", ltv_cac: 1.6, b_rate: 0.10, runway: 36, moe: 10, type: 'SYNTHETIC' },
    { name: "Cloud Kitchen (S)", ltv_cac: 1.3, b_rate: 0.15, runway: 12, moe: 40, type: 'SYNTHETIC' },
    { name: "FinTech RegRisk (S)", ltv_cac: 3.8, b_rate: 0.75, runway: 14, moe: 75, type: 'SYNTHETIC' },
    { name: "Logistics Optimizer (S)", ltv_cac: 4.2, b_rate: 0.15, runway: 11, moe: 60, type: 'SYNTHETIC' }
];

console.log("# EXECUTION REPORT: V8.2 INSTITUTIONAL DEFENSE AUDIT");
console.log("| COMPANY | VERDICT | TRUE EV | ALLOC (%) | P(SAFE) | CLASS |");
console.log("| :--- | :--- | :--- | :--- | :--- | :--- |");

CASES.forEach(c => {
    const sim = {
        bankruptcyRate: c.b_rate,
        runway: c.runway,
        inputs: { ltv_cac: c.ltv_cac },
        runs: [{ outcome: 1, severity: 0 }]
    };
    const post = computePosterior(c.moe, sim);
    const policy = applyDecisionPolicy(post, sim);

    console.log(`| ${c.name} | **${policy.verdict}** | ${policy.expectedValue}x | ${Math.round(policy.positionSize * 100)}% | ${(post.probabilities.safe * 100).toFixed(1)}% | ${c.type} |`);
});
