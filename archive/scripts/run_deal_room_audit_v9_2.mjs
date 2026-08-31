/**
 * OpenGravity V9.2 — THE DEAL ROOM MATRIX (50 CASES)
 */
import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';
import { simulateOutcome } from './data_engine_v1.mjs';

const DATASET = [
    { name: "SpaceX (2024)", ltv_cac: 12.0, runway: 24, rev: 800000000, cap: 5000000000, opex: 400000000, moe: 98, regime: 'NORMAL' },
    { name: "Stripe (Early)", ltv_cac: 9.5, runway: 18, rev: 2000000, cap: 20000000, opex: 800000, moe: 92, regime: 'NORMAL' },
    { name: "Mistral AI (2024)", ltv_cac: 5.5, runway: 14, rev: 1000000, cap: 600000000, opex: 5000000, moe: 95, regime: 'BULL_HYPE' },
    { name: "Figma (Pre-Adobe)", ltv_cac: 15.0, runway: 30, rev: 15000000, cap: 200000000, opex: 4000000, moe: 90, regime: 'NORMAL' },
    { name: "Apple (1997)", ltv_cac: 3.2, runway: 3, rev: 1500000000, cap: 1000000000, opex: 2000000000, moe: 40, regime: 'LIQUIDITY_CRUNCH' },
    { name: "Amazon (2001)", ltv_cac: 2.8, runway: 5, rev: 800000000, cap: 500000000, opex: 1000000000, moe: 65, regime: 'BEAR_MARKET' },
    { name: "Tesla (2018)", ltv_cac: 2.1, runway: 2, rev: 4000000000, cap: 2000000000, opex: 4500000000, moe: 85, regime: 'LIQUIDITY_CRUNCH' },
    { name: "Nvidia (Early)", ltv_cac: 4.8, runway: 10, rev: 500000, cap: 2000000, opex: 400000, moe: 70, regime: 'NORMAL' },
    { name: "DeepL (2024)", ltv_cac: 8.2, runway: 20, rev: 5000000, cap: 100000000, opex: 1500000, moe: 88, regime: 'NORMAL' },
    { name: "Revolut (2023)", ltv_cac: 4.1, runway: 15, rev: 80000000, cap: 500000000, opex: 60000000, moe: 82, regime: 'NORMAL' },
    { name: "Notion (2022)", ltv_cac: 6.5, runway: 24, rev: 8000000, cap: 250000000, opex: 3000000, moe: 85, regime: 'NORMAL' },
    { name: "Canva (Growth)", ltv_cac: 10.2, runway: 36, rev: 25000000, cap: 500000000, opex: 10000000, moe: 91, regime: 'NORMAL' },
    { name: "Discord (Early)", ltv_cac: 5.8, runway: 12, rev: 200000, cap: 15000000, opex: 800000, moe: 75, regime: 'NORMAL' },
    { name: "Datadog (IPO)", ltv_cac: 5.1, runway: 18, rev: 40000000, cap: 100000000, opex: 25000000, moe: 88, regime: 'NORMAL' },
    { name: "Klarna (2022)", ltv_cac: 1.9, runway: 9, rev: 150000000, cap: 800000000, opex: 200000000, moe: 70, regime: 'BEAR_MARKET' },
    { name: "Shopify (2012)", ltv_cac: 4.8, runway: 14, rev: 3500000, cap: 15000000, opex: 2500000, moe: 65, regime: 'NORMAL' },
    { name: "Spotify (Early)", ltv_cac: 3.5, runway: 8, rev: 10000000, cap: 50000000, opex: 18000000, moe: 80, regime: 'NORMAL' },
    { name: "Nubank (Early)", ltv_cac: 6.2, runway: 20, rev: 2000000, cap: 30000000, opex: 1500000, moe: 85, regime: 'NORMAL' },
    { name: "Vinted (2023)", ltv_cac: 3.1, runway: 14, rev: 45000000, cap: 150000000, opex: 38000000, moe: 60, regime: 'NORMAL' },
    { name: "Deel (2024)", ltv_cac: 9.1, runway: 22, rev: 40000000, cap: 400000000, opex: 12000000, moe: 93, regime: 'NORMAL' },
    { name: "Juicero", ltv_cac: 0.4, runway: 14, rev: 10000, cap: 120000000, opex: 5000000, moe: 80, regime: 'BULL_HYPE' },
    { name: "Theranos", ltv_cac: 0.2, runway: 36, rev: 100000, cap: 700000000, opex: 10000000, moe: 99, regime: 'BULL_HYPE' },
    { name: "Fast.co", ltv_cac: 0.85, runway: 12, rev: 50000, cap: 100000000, opex: 10000000, moe: 95, regime: 'BULL_HYPE' },
    { name: "Jawbone", ltv_cac: 1.15, runway: 12, rev: 15000000, cap: 900000000, opex: 40000000, moe: 70, regime: 'NORMAL' },
    { name: "Quibi", ltv_cac: 0.6, runway: 18, rev: 20000, cap: 1750000000, opex: 150000000, moe: 92, regime: 'NORMAL' },
    { name: "Segway (Original)", ltv_cac: 0.5, runway: 24, rev: 1000000, cap: 100000000, opex: 15000000, moe: 95, regime: 'BULL_HYPE' },
    { name: "Blue Apron (IPO)", ltv_cac: 1.35, runway: 15, rev: 200000000, cap: 150000000, opex: 220000000, moe: 40, regime: 'NORMAL' },
    { name: "Katerra", ltv_cac: 1.1, runway: 12, rev: 50000000, cap: 2000000000, opex: 150000000, moe: 80, regime: 'NORMAL' },
    { name: "Zume Pizza", ltv_cac: 0.8, runway: 14, rev: 500000, cap: 400000000, opex: 20000000, moe: 85, regime: 'BULL_HYPE' },
    { name: "WeWork (Pre-IPO)", ltv_cac: 1.1, runway: 10, rev: 400000000, cap: 10000000000, opex: 900000000, moe: 90, regime: 'BULL_HYPE' },
    { name: "Peloton (2024)", ltv_cac: 1.75, runway: 11, rev: 150000000, cap: 600000000, opex: 200000000, moe: 25, regime: 'BEAR_MARKET' },
    { name: "Etsy (Early)", ltv_cac: 4.2, runway: 20, rev: 500000, cap: 2000000, opex: 300000, moe: 60, regime: 'NORMAL' },
    { name: "Slack (2024)", ltv_cac: 6.8, runway: 60, rev: 500000000, cap: 20000000000, opex: 100000000, moe: 85, regime: 'NORMAL' },
    { name: "Zoom (Crisis 2024)", ltv_cac: 11.5, runway: 48, rev: 350000000, cap: 15000000000, opex: 50000000, moe: 65, regime: 'BEAR_MARKET' },
    { name: "Lemonade (Early)", ltv_cac: 2.5, runway: 15, rev: 1500000, cap: 50000000, opex: 2500000, moe: 70, regime: 'BULL_HYPE' },
    { name: "Affirm (IPO)", ltv_cac: 2.2, runway: 24, rev: 120000000, cap: 1200000000, opex: 150000000, moe: 78, regime: 'NORMAL' },
    { name: "Toast (Early)", ltv_cac: 5.4, runway: 12, rev: 800000, cap: 10000000, opex: 700000, moe: 82, regime: 'NORMAL' },
    { name: "Twilio (IPO)", ltv_cac: 4.5, runway: 18, rev: 45000000, cap: 150000000, opex: 35000000, moe: 80, regime: 'NORMAL' },
    { name: "Plaid (2024)", ltv_cac: 7.8, runway: 24, rev: 18000000, cap: 500000000, opex: 4000000, moe: 91, regime: 'NORMAL' },
    { name: "Anthropic (2024)", ltv_cac: 3.5, runway: 12, rev: 10000000, cap: 4000000000, opex: 200000000, moe: 98, regime: 'BULL_HYPE' },
    { name: "Rivian (2024)", ltv_cac: 1.6, runway: 18, rev: 1200000000, cap: 10000000000, opex: 1800000000, moe: 60, regime: 'NORMAL' },
    { name: "Instacart (IPO)", ltv_cac: 1.55, runway: 24, rev: 700000000, cap: 2000000000, opex: 650000000, moe: 45, regime: 'NORMAL' },
    { name: "DoorDash (Early)", ltv_cac: 1.7, runway: 10, rev: 50000000, cap: 100000000, opex: 70000000, moe: 55, regime: 'BULL_HYPE' },
    { name: "Robinhood (2022)", ltv_cac: 1.8, runway: 20, rev: 350000000, cap: 5000000000, opex: 450000000, moe: 50, regime: 'BEAR_MARKET' },
    { name: "Better.com (S)", ltv_cac: 1.52, runway: 12, rev: 15000000, cap: 500000000, opex: 40000000, moe: 30, regime: 'BEAR_MARKET' },
    { name: "Hims (Early)", ltv_cac: 2.8, runway: 15, rev: 5000000, cap: 40000000, opex: 6000000, moe: 65, regime: 'NORMAL' },
    { name: "Casper (IPO)", ltv_cac: 1.45, runway: 12, rev: 120000000, cap: 150000000, opex: 140000000, moe: 20, regime: 'NORMAL' },
    { name: "Bird (S)", ltv_cac: 1.2, runway: 8, rev: 15000000, cap: 200000000, opex: 35000000, moe: 40, regime: 'NORMAL' },
    { name: "Gorillas (S)", ltv_cac: 0.95, runway: 6, rev: 25000000, cap: 500000000, opex: 80000000, moe: 85, regime: 'BULL_HYPE' },
    { name: "Cazoo (S)", ltv_cac: 1.1, runway: 10, rev: 100000000, cap: 400000000, opex: 150000000, moe: 35, regime: 'NORMAL' }
];

async function runDealRoomAudit() {
    let results = [];

    for (const c of DATASET) {
        const inputs = { ltv_cac: c.ltv_cac, monthlyRevenue: c.rev, initialCapital: c.cap, fixedOpEx: c.opex };
        const runs = Array.from({ length: 100 }, () => simulateOutcome(inputs, c.regime));
        const bankruptcyRate = runs.filter(r => r.outcome === 0).length / 100;
        
        const sim = { bankruptcyRate, runway: c.runway, inputs, runs };
        const post = computePosterior(c.moe, sim);
        const policy = applyDecisionPolicy(post, sim);

        results.push({ name: c.name, ...policy });
    }

    // ORDENAR POR RANKING SCORE (Prioridad del Comité)
    results.sort((a, b) => b.rankingScore - a.rankingScore);

    console.log("# 🏛️ OPEN GRAVITY V9.2: THE DEAL ROOM MATRIX");
    console.log("## Prioritized by Ranking Score (EV * Confidence) | Sales-Speak Enabled\n");
    
    console.log("| RANK | ENTIDAD | VERDICTO | DEAL SCORE | EST. EV | ALLOC | INVESTMENT THESIS |");
    console.log("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |");

    results.forEach((r, idx) => {
        console.log(`| ${idx+1} | ${r.name} | **${r.verdict}** | ${r.rankingScore} | ${r.expectedValue}x | ${Math.round(r.positionSize * 100)}% | ${r.trace.thesis} |`);
    });
}

runDealRoomAudit();
