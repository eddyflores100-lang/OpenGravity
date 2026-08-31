/**
 * OpenGravity — OOS Validation Pipeline V6.2.1 (The Truth Machine)
 */

import fs from 'fs';

const SPLIT_RATIO = 0.70;

// MINI-SIMULADOR PROBABILÍSTICO (Para generar la señal de entrada)
function runMonteCarloSignal(inputs) {
    let bankruptcies = 0;
    const runs = 50; // Reducido para velocidad de calibración
    
    for (let r = 0; r < runs; r++) {
        let cash = inputs.initialCapital;
        let revenue = inputs.monthlyRevenue;
        // Añadimos ruido estocástico al burn y al growth
        const burnVar = sampleNormal(inputs.fixedOpEx, inputs.fixedOpEx * 0.1);
        const skew = Math.random() < 0.2 ? 0.8 : 1.0; // Eventos cisne negro

        for (let m = 1; m <= 24; m++) {
            cash = cash - burnVar + (revenue * skew);
            const growth = (inputs.ltv_cac / 15) * (0.9 + Math.random() * 0.2);
            revenue = revenue + (revenue * growth) - (revenue * 0.06);
            if (cash <= 0) { bankruptcies++; break; }
        }
    }
    return bankruptcies / runs;
}

function sampleNormal(mean, std) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// LÓGICA DE INFERENCIA V6.2.1
function computeProbs(moeScore, runway, bRate, A, B) {
    const rawScore = (0.7 * (1 - bRate)) + (0.3 * (moeScore / 100));
    const logitSuccess = -(A * rawScore + B);
    const logitBankruptcy = Math.log(bRate + 1e-6) + (runway < 6 ? 0.3 : 0);
    const logitZombie = -0.7 * rawScore + 0.4 * (Math.min(1, runway / 24));

    const exp = [logitSuccess, logitBankruptcy, logitZombie].map(Math.exp);
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp[0] / sum; 
}

async function runValidation() {
    console.log(`\n🕵️ INICIANDO VALIDACIÓN PURA V6.2.1`);
    const data = JSON.parse(fs.readFileSync('./ground_truth_v1.json', 'utf8'));
    
    // Procesamos la simulación real para cada caso antes de calibrar
    console.log(`⏳ Simulando señales de riesgo para ${data.length} casos...`);
    const processedData = data.map(item => ({
        inputs: item.inputs,
        outcome: item.outcome,
        bRate: runMonteCarloSignal(item.inputs),
        runway: item.inputs.initialCapital / item.inputs.fixedOpEx
    }));

    const shuffled = processedData.sort(() => Math.random() - 0.5);
    const trainSet = shuffled.slice(0, Math.floor(shuffled.length * 0.7));
    const testSet = shuffled.slice(Math.floor(shuffled.length * 0.7));

    // CALIBRACIÓN
    let bestA = -9.8, bestB = 4.8, minBrier = Infinity;
    for (let a = -15; a <= -5; a += 1) {
        for (let b = 1; b <= 9; b += 1) {
            let brier = 0;
            trainSet.forEach(it => {
                const p = computeProbs(50, it.runway, it.bRate, a, b);
                brier += Math.pow(p - (it.outcome === 0 ? 1 : 0), 2);
            });
            if ((brier/trainSet.length) < minBrier) {
                minBrier = brier/trainSet.length;
                bestA = a; bestB = b;
            }
        }
    }

    // UMBRAL
    let bestT = 0.3, maxY = -1;
    for (let t = 0.1; t <= 0.8; t += 0.05) {
        let tp=0, fp=0, tn=0, fn=0;
        trainSet.forEach(it => {
            const p = computeProbs(50, it.runway, it.bRate, bestA, bestB);
            if (p >= t && it.outcome === 0) tp++;
            else if (p < t && it.outcome !== 0) tn++;
            else if (p >= t && it.outcome !== 0) fp++;
            else fn++;
        });
        const y = (tp/(tp+fn||1)) + (tn/(tn+fp||1)) - 1;
        if (y > maxY) { maxY = y; bestT = t; }
    }

    // EVAL FINAL (OOS)
    let brier = 0, logloss = 0, correct = 0;
    testSet.forEach(it => {
        const p = computeProbs(50, it.runway, it.bRate, bestA, bestB);
        const y = it.outcome === 0 ? 1 : 0;
        brier += Math.pow(p - y, 2);
        logloss -= (y * Math.log(p + 1e-6) + (1-y) * Math.log(1-p+1e-6));
        if ((p >= bestT) === (y === 1)) correct++;
    });

    console.log(`\n=========================================`);
    console.log(`🏁 RESULTADOS OOS (VERDAD MATEMÁTICA)`);
    console.log(`=========================================`);
    console.log(`Accuracy (OOS):  ${((correct/testSet.length)*100).toFixed(2)}%`);
    console.log(`Brier Score:      ${(brier/testSet.length).toFixed(4)}`);
    console.log(`Log Loss:         ${(logloss/testSet.length).toFixed(4)}`);
    console.log(`Youden Index:     ${maxY.toFixed(4)}`);
    console.log(`=========================================`);
}

runValidation();
