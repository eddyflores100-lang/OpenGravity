import { runMonteCarlo } from './open-gravity-ui/src/lib/simulation_runner.ts';

async function testBiotech() {
    console.log("🧪 Simulando Startup de Biotecnología (Cura de Alzheimer)...");
    
    const input = {
        jobId: "Biotech_Trial_Test",
        seed: "biotech_alpha_1",
        specialization: "biotech",
        initialCash: 5000000, // $5M
        rdMonthlyBurn: 200000, // $200k burn en R&D
        fixedOpEx: 50000,
        trialFailProb: 0.7, // 70% de fallo (realista para Fase II)
        horizonMonths: 36,
        researchTrustScore: 0.8
    };

    const result = runMonteCarlo(input);

    console.log("-----------------------------------------");
    console.log(`Tasa de Bancarrota: ${(result.bankruptcyRate * 100).toFixed(1)}%`);
    console.log(`Drawdown Máximo P50: $${result.drawdown.p50.toLocaleString()}`);
    console.log("-----------------------------------------");
    
    if (result.bankruptcyRate > 0.6) {
        console.log("✅ RESULTADO CALIBRADO: La alta tasa de bancarrota refleja los fallos binarios de los ensayos clínicos.");
    } else {
        console.log("❌ ERROR DE CALIBRACIÓN: La tasa es demasiado baja.");
    }
}

testBiotech();
