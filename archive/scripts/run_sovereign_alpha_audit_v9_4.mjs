/**
 * OpenGravity V9.4 — SOVEREIGN ALPHA FUND OPTIMIZER
 * "100% Solvency & Strategic Bucketing"
 */
import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';
import { simulateOutcome } from './data_engine_v1.mjs';

const DATASET = [
    { name: "SpaceX (2024)", ltv_cac: 12.0, runway: 24, rev: 800000000, cap: 5000000000, opex: 400000000, moe: 98, regime: 'NORMAL', sector: 'Space' },
    { name: "Figma (Pre-Adobe)", ltv_cac: 15.0, runway: 30, rev: 15000000, cap: 200000000, opex: 4000000, moe: 90, regime: 'NORMAL', sector: 'SaaS' },
    { name: "Mistral AI (2024)", ltv_cac: 5.5, runway: 14, rev: 1000000, cap: 600000000, opex: 5000000, moe: 95, regime: 'BULL_HYPE', sector: 'AI' },
    { name: "Anthropic (2024)", ltv_cac: 3.5, runway: 12, rev: 10000000, cap: 4000000000, opex: 200000000, moe: 98, regime: 'BULL_HYPE', sector: 'AI' },
    { name: "DeepL (2024)", ltv_cac: 8.2, runway: 20, rev: 5000000, cap: 100000000, opex: 1500000, moe: 88, regime: 'NORMAL', sector: 'AI' },
    { name: "Stripe (Early)", ltv_cac: 9.5, runway: 18, rev: 2000000, cap: 20000000, opex: 800000, moe: 92, regime: 'NORMAL', sector: 'FinTech' },
    { name: "Nubank (Early)", ltv_cac: 6.2, runway: 20, rev: 2000000, cap: 30000000, opex: 1500000, moe: 85, regime: 'NORMAL', sector: 'FinTech' },
    { name: "Revolut (2023)", ltv_cac: 4.1, runway: 15, rev: 80000000, cap: 500000000, opex: 60000000, moe: 82, regime: 'NORMAL', sector: 'FinTech' },
    { name: "Apple (1997)", ltv_cac: 3.2, runway: 3, rev: 1500000000, cap: 1000000000, opex: 2000000000, moe: 40, regime: 'LIQUIDITY_CRUNCH', sector: 'Consumer' },
    { name: "Tesla (2018)", ltv_cac: 2.1, runway: 2, rev: 4000000000, cap: 2000000000, opex: 4500000000, moe: 85, regime: 'LIQUIDITY_CRUNCH', sector: 'HardTech' },
    { name: "Notion (2022)", ltv_cac: 6.5, runway: 24, rev: 8000000, cap: 250000000, opex: 3000000, moe: 85, regime: 'NORMAL', sector: 'SaaS' },
    { name: "Discord (Early)", ltv_cac: 5.8, runway: 12, rev: 200000, cap: 15000000, opex: 800000, moe: 75, regime: 'NORMAL', sector: 'Social' }
];

async function runOptimizedFund() {
    let rawResults = [];

    // Etapa 1: Análisis Individual
    for (const c of DATASET) {
        const inputs = { ltv_cac: c.ltv_cac, monthlyRevenue: c.rev, initialCapital: c.cap, fixedOpEx: c.opex };
        const runs = Array.from({ length: 100 }, () => simulateOutcome(inputs, c.regime));
        const bankruptcyRate = runs.filter(r => r.outcome === 0).length / 100;
        const sim = { bankruptcyRate, runway: c.runway, inputs, runs };
        const post = computePosterior(c.moe, sim);
        const policy = applyDecisionPolicy(post, sim);

        rawResults.push({ name: c.name, sector: c.sector, ...policy });
    }

    // Etapa 2: Agrupación por Sector y Estrategia
    const SECTOR_CAP = 0.30; // Max 30% por sector
    const SPECIAL_SITUATIONS_CAP = 0.05; // Max 5% total

    let sectors = {};
    rawResults.forEach(r => {
        if (!sectors[r.sector]) sectors[r.sector] = [];
        sectors[r.sector].push(r);
    });

    // Etapa 3: Optimización Sectorial (Winner-Takes-More)
    Object.keys(sectors).forEach(s => {
        const sectorApps = sectors[s];
        const totalSectorScore = sectorApps.reduce((a, b) => a + b.rankingScore, 0);
        
        sectorApps.forEach(r => {
            // Peso relativo dentro del sector
            const relativeWeight = r.rankingScore / totalSectorScore;
            r.adjustedAlloc = r.rawAlloc * relativeWeight * 1.5; // Potenciar ganadores
        });

        // Aplicar Cap Sectorial
        const sumSector = sectorApps.reduce((a, b) => a + b.adjustedAlloc, 0);
        if (sumSector > SECTOR_CAP) {
            sectorApps.forEach(r => r.adjustedAlloc *= (SECTOR_CAP / sumSector));
        }
    });

    // Etapa 4: Bucket Cap (Special Situations)
    const specialSituations = rawResults.filter(r => r.strategy === "SPECIAL_SITUATIONS");
    const sumSpec = specialSituations.reduce((a, b) => a + b.adjustedAlloc, 0);
    if (sumSpec > SPECIAL_SITUATIONS_CAP) {
        specialSituations.forEach(r => r.adjustedAlloc *= (SPECIAL_SITUATIONS_CAP / sumSpec));
    }

    // Etapa 5: Normalización Global a 100%
    const finalSum = rawResults.reduce((a, b) => a + b.adjustedAlloc, 0);
    rawResults.forEach(r => r.finalAlloc = r.adjustedAlloc / finalSum);

    // Salida
    console.log("# 🏛️ OPEN GRAVITY V9.4: THE SOVEREIGN ALPHA FUND");
    console.log("## 100% Capital Solvency | Sectoral Gating | Bucket: Special Situations\n");
    
    console.log("| RANK | ENTIDAD | ESTRATEGIA | SECTOR | SCORE | FINAL ALLOC | STATUS |");
    console.log("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |");

    rawResults.sort((a, b) => b.finalAlloc - a.finalAlloc).forEach((r, idx) => {
        const allocStr = (r.finalAlloc * 100).toFixed(1) + "%";
        console.log(`| ${idx+1} | ${r.name} | ${r.strategy} | ${r.sector} | ${r.rankingScore} | **${allocStr}** | ${r.verdict} |`);
    });

    const checkSum = rawResults.reduce((a, b) => a + b.finalAlloc, 0);
    console.log(`\n**SOLVENCY CHECK:** Total Fund Allocation = **${(checkSum * 100).toFixed(1)}%**`);
}

runOptimizedFund();
