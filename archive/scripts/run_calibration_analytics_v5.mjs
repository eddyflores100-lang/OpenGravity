import fs from 'fs';

/**
 * ═══════════════════════════════════════════════════════════════════
 * OpenGravity — Calibration Analytics Engine V5 (FIXED MAPPING)
 * ═══════════════════════════════════════════════════════════════════
 */

const GT_PATH = './ground_truth_v1.json';
const PARAMS_PATH = './calibration_params.json';

function plattScaling(rawScore, A, B) {
    const val = A * rawScore + B;
    // Protección contra overflow de exp
    if (val > 100) return 0;
    if (val < -100) return 1;
    return 1 / (1 + Math.exp(val));
}

function computePosterior(features, A, B) {
    const W = {
        mcSurvivorRate:     0.40,
        ltvCacRatio:        0.25,
        expertConsensus:    0.15,
        marketGrowth:       0.10,
        cashRunway:         0.05,
        researchTrust:      0.05,
    };

    // Mapeo robusto desde inputs a features de calibración
    const f_mc       = features.runway_months > 12 ? 0.8 : 0.3; // Proxy de supervivencia basado en runway
    const f_ltvcac   = Math.min((features.ltv_cac || 0) / 10, 1);
    const f_expert   = features.data_confidence || 0.5;
    const f_market   = 0.5; // Constante para auditoría estática
    const f_runway   = Math.min((features.runway_months || 0) / 18, 1);
    const f_trust    = features.data_confidence || 0.5;

    const rawScore =
        W.mcSurvivorRate   * f_mc     +
        W.ltvCacRatio      * f_ltvcac +
        W.expertConsensus  * f_expert +
        W.marketGrowth     * f_market +
        W.cashRunway       * f_runway +
        W.researchTrust    * f_trust;

    return plattScaling(rawScore, A, B);
}

function calculateBrier(dataset, A, B) {
    let sumErr = 0;
    for (const item of dataset) {
        const pSuccess = computePosterior(item.features, A, B);
        const ySuccess = item.outcome === 0 ? 1 : 0;
        const err = Math.pow(pSuccess - ySuccess, 2);
        if (!isNaN(err)) sumErr += err;
    }
    return sumErr / dataset.length;
}

async function runOptimization() {
    console.log(`\n🚀 RE-INICIANDO AUDITORÍA ANALÍTICA V5 [MAPPING FIXED]`);
    
    if (!fs.existsSync(GT_PATH)) {
        console.error("❌ Ground Truth no encontrado.");
        return;
    }

    const groundTruth = JSON.parse(fs.readFileSync(GT_PATH, 'utf8'));
    
    let bestA = -1.8;
    let bestB = 0.85;
    let minBrier = Infinity;

    // Grid Search
    for (let a = -10.0; a <= 0; a += 0.2) {
        for (let b = -5.0; b <= 5.0; b += 0.2) {
            const brier = calculateBrier(groundTruth, a, b);
            if (brier < minBrier) {
                minBrier = brier;
                bestA = a;
                bestB = b;
            }
        }
    }

    const finalResults = groundTruth.map(item => {
        const pSuccess = computePosterior(item.features, bestA, bestB);
        const ySuccess = item.outcome === 0 ? 1 : 0;
        return {
            name: item.name,
            pSuccess: Number(pSuccess.toFixed(4)),
            actual: ySuccess,
            error: Math.pow(pSuccess - ySuccess, 2)
        };
    });

    const n = finalResults.length;
    
    // ─── OPTIMIZACIÓN DE UMBRAL (V5.2: Youden Index) ───
    let bestThreshold = 0.5;
    let maxYouden = -1;

    for (let t = 0.3; t <= 0.7; t += 0.01) {
        let tp = 0, fp = 0, tn = 0, fn = 0;
        
        finalResults.forEach(res => {
            // SINCRO TOTAL: Usamos pSuccess que ya fue calculado con los mejores A y B
            const pred = res.pSuccess >= t;
            const actual = res.actual === 1;
            
            if (pred && actual) tp++;
            else if (pred && !actual) fp++;
            else if (!pred && !actual) tn++;
            else if (!pred && actual) fn++;
        });

        const sensitivity = tp / (tp + fn || 1);
        const specificity = tn / (tn + fp || 1);
        const youden = sensitivity + specificity - 1;

        if (youden > maxYouden) {
            maxYouden = youden;
            bestThreshold = t;
        }
    }

    const accuracy = finalResults.filter(r => (r.pSuccess >= bestThreshold && r.actual === 1) || (r.pSuccess < bestThreshold && r.actual === 0)).length / n;
    const tp = finalResults.filter(r => r.pSuccess >= bestThreshold && r.actual === 1).length;
    const fp = finalResults.filter(r => r.pSuccess >= bestThreshold && r.actual === 0).length;
    const fn = finalResults.filter(r => r.pSuccess < bestThreshold && r.actual === 1).length;
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;

    console.log(`\n=========================================`);
    console.log(`🎯 CALIBRACIÓN EXITOSA V5.2`);
    console.log(`=========================================`);
    console.log(`Parámetros Óptimos: A=${bestA.toFixed(2)}, B=${bestB.toFixed(2)}`);
    console.log(`Optimal Threshold: ${bestThreshold.toFixed(2)}`);
    console.log(`Youden Index:      ${maxYouden.toFixed(4)}`);
    console.log(`Brier Score:       ${minBrier.toFixed(4)}`);
    console.log(`Accuracy:          ${(accuracy * 100).toFixed(2)}%`);
    console.log(`Precision:         ${(precision * 100).toFixed(2)}%`);
    console.log(`Recall:            ${(recall * 100).toFixed(2)}%`);
    console.log(`=========================================\n`);

    fs.writeFileSync(PARAMS_PATH, JSON.stringify({
        A: bestA, B: bestB,
        optimalThreshold: bestThreshold,
        youdenIndex: maxYouden,
        calibratedAt: new Date().toISOString(),
        metrics: { brierScore: minBrier, accuracy, precision, recall }
    }, null, 2));

    fs.writeFileSync('./open-gravity-ui/calibration_analytics.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        metrics: { brierScore: minBrier, accuracy, precision, recall },
        results: finalResults.slice(0, 100)
    }, null, 2));
    
    // EXPORTAR CSV PARA EXCEL
    const csvHeaders = "Startup Name,P(Success),Actual Outcome,Squared Error\n";
    const csvRows = finalResults.map(r => `"${r.name}",${r.pSuccess},${r.actual},${r.error.toFixed(4)}`).join('\n');
    fs.writeFileSync('reporte_calibracion_final.csv', csvHeaders + csvRows);
}

runOptimization();
