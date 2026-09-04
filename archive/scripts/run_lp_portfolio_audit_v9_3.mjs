/**
 * OpenGravity V9.3 — THE LP PORTFOLIO AUDIT
 * "The Fund Manager Edition"
 */
import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';
import { simulateOutcome } from './data_engine_v1.mjs';

const DATASET = [
    { name: "SpaceX (2024)", ltv_cac: 12.0, runway: 24, rev: 800000000, cap: 5000000000, opex: 400000000, moe: 98, regime: 'NORMAL', sector: 'SpaceTech' },
    { name: "Stripe (Early)", ltv_cac: 9.5, runway: 18, rev: 2000000, cap: 20000000, opex: 800000, moe: 92, regime: 'NORMAL', sector: 'FinTech' },
    { name: "Mistral AI (2024)", ltv_cac: 5.5, runway: 14, rev: 1000000, cap: 600000000, opex: 5000000, moe: 95, regime: 'BULL_HYPE', sector: 'AI' },
    { name: "Figma (Pre-Adobe)", ltv_cac: 15.0, runway: 30, rev: 15000000, cap: 200000000, opex: 4000000, moe: 90, regime: 'NORMAL', sector: 'SaaS' },
    { name: "Apple (1997)", ltv_cac: 3.2, runway: 3, rev: 1500000000, cap: 1000000000, opex: 2000000000, moe: 40, regime: 'LIQUIDITY_CRUNCH', sector: 'ConsumerTech' },
    { name: "Amazon (2001)", ltv_cac: 2.8, runway: 5, rev: 800000000, cap: 500000000, opex: 1000000000, moe: 65, regime: 'BEAR_MARKET', sector: 'E-commerce' },
    { name: "Tesla (2018)", ltv_cac: 2.1, runway: 2, rev: 4000000000, cap: 2000000000, opex: 4500000000, moe: 85, regime: 'LIQUIDITY_CRUNCH', sector: 'HardTech' },
    { name: "Nvidia (Early)", ltv_cac: 4.8, runway: 10, rev: 500000, cap: 2000000, opex: 400000, moe: 70, regime: 'NORMAL', sector: 'Semiconductors' },
    { name: "DeepL (2024)", ltv_cac: 8.2, runway: 20, rev: 5000000, cap: 100000000, opex: 1500000, moe: 88, regime: 'NORMAL', sector: 'AI' },
    { name: "Revolut (2023)", ltv_cac: 4.1, runway: 15, rev: 80000000, cap: 500000000, opex: 60000000, moe: 82, regime: 'NORMAL', sector: 'FinTech' },
    { name: "Anthropic (2024)", ltv_cac: 3.5, runway: 12, rev: 10000000, cap: 4000000000, opex: 200000000, moe: 98, regime: 'BULL_HYPE', sector: 'AI' },
    { name: "Notion (2022)", ltv_cac: 6.5, runway: 24, rev: 8000000, cap: 250000000, opex: 3000000, moe: 85, regime: 'NORMAL', sector: 'SaaS' },
    { name: "Discord (Early)", ltv_cac: 5.8, runway: 12, rev: 200000, cap: 15000000, opex: 800000, moe: 75, regime: 'NORMAL', sector: 'Social' },
    { name: "Shopify (2012)", ltv_cac: 4.8, runway: 14, rev: 3500000, cap: 15000000, opex: 2500000, moe: 65, regime: 'NORMAL', sector: 'E-commerce' },
    { name: "Nubank (Early)", ltv_cac: 6.2, runway: 20, rev: 2000000, cap: 30000000, opex: 1500000, moe: 85, regime: 'NORMAL', sector: 'FinTech' },
    { name: "Juicero", ltv_cac: 0.4, runway: 14, rev: 10000, cap: 120000000, opex: 5000000, moe: 80, regime: 'BULL_HYPE', sector: 'Hardware' },
    { name: "Theranos", ltv_cac: 0.2, runway: 36, rev: 100000, cap: 700000000, opex: 10000000, moe: 99, regime: 'BULL_HYPE', sector: 'BioTech' },
    { name: "WeWork (Pre-IPO)", ltv_cac: 1.1, runway: 10, rev: 400000000, cap: 10000000000, opex: 900000000, moe: 90, regime: 'BULL_HYPE', sector: 'RealEstate' }
    // ... simplificado para demo de impacto de clúster
];

async function runPortfolioAudit() {
    let results = [];
    let sectorCounts = {};

    // Primer paso: Conteo de sectores
    DATASET.forEach(c => {
        sectorCounts[c.sector] = (sectorCounts[c.sector] || 0) + 1;
    });

    for (const c of DATASET) {
        const inputs = { ltv_cac: c.ltv_cac, monthlyRevenue: c.rev, initialCapital: c.cap, fixedOpEx: c.opex };
        const runs = Array.from({ length: 100 }, () => simulateOutcome(inputs, c.regime));
        const bankruptcyRate = runs.filter(r => r.outcome === 0).length / 100;
        
        const sim = { bankruptcyRate, runway: c.runway, inputs, runs };
        const post = computePosterior(c.moe, sim);
        
        // Pasamos el contexto del portafolio (Cluster Penalty)
        const policy = applyDecisionPolicy(post, sim, { clusterCount: sectorCounts[c.sector] });

        results.push({ name: c.name, sector: c.sector, ...policy });
    }

    results.sort((a, b) => b.rankingScore - a.rankingScore);

    console.log("# 📦 OPEN GRAVITY V9.3: THE LP PORTFOLIO MATRIX");
    console.log("## Tiered Allocation & Correlation Management | Unified Alpha\n");
    
    console.log("| RANK | ENTIDAD | SECTOR | DEAL SCORE | ALLOC | PORTFOLIO NOTE |");
    console.log("| :--- | :--- | :--- | :--- | :--- | :--- |");

    results.forEach((r, idx) => {
        console.log(`| ${idx+1} | ${r.name} | ${r.sector} | ${r.rankingScore} | **${Math.round(r.positionSize * 100)}%** | ${r.trace.portfolioNote} |`);
    });
}

runPortfolioAudit();
