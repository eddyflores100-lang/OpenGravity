/**
 * OpenGravity V9.6 — CONFUSION MATRIX CALCULATOR
 * Mission: Final Verification against User Ground Truth.
 */

const PREDICTIONS = [
  { "id": 1, "verdict": "INVEST" }, { "id": 2, "verdict": "DROP" }, { "id": 3, "verdict": "INVEST" },
  { "id": 4, "verdict": "DROP" }, { "id": 5, "verdict": "INVEST" }, { "id": 6, "verdict": "REVIEW" },
  { "id": 7, "verdict": "INVEST" }, { "id": 8, "verdict": "DROP" }, { "id": 9, "verdict": "INVEST" },
  { "id": 10, "verdict": "DROP" }, { "id": 11, "verdict": "INVEST" }, { "id": 12, "verdict": "DROP" },
  { "id": 13, "verdict": "INVEST" }, { "id": 14, "verdict": "DROP" }, { "id": 15, "verdict": "INVEST" },
  { "id": 16, "verdict": "DROP" }, { "id": 17, "verdict": "INVEST" }, { "id": 18, "verdict": "DROP" },
  { "id": 19, "verdict": "INVEST" }, { "id": 20, "verdict": "INVEST" }, { "id": 21, "verdict": "REVIEW" },
  { "id": 22, "verdict": "DROP" }, { "id": 23, "verdict": "INVEST" }, { "id": 24, "verdict": "DROP" },
  { "id": 25, "verdict": "INVEST" }, { "id": 26, "verdict": "DROP" }, { "id": 27, "verdict": "INVEST" },
  { "id": 28, "verdict": "INVEST" }, { "id": 29, "verdict": "DROP" }, { "id": 30, "verdict": "INVEST" }
];

export function calculateMetrics(groundTruth) {
    let stats = { TP: 0, TN: 0, FP: 0, FN: 0, UNICORN_KILLS: 0, total: PREDICTIONS.length };
    
    PREDICTIONS.forEach(p => {
        const truth = groundTruth.find(t => t.id === p.id);
        if (!truth) return;

        const isWinner = truth.real === "WINNER";
        const isTrash = truth.real === "DEAD" || truth.real === "ZOMBIE";

        if (p.verdict === "DROP") {
            if (isTrash) stats.TN++;
            if (isWinner) {
                stats.FN++;
                stats.UNICORN_KILLS++;
            }
        } else if (p.verdict === "INVEST") {
            if (isWinner) stats.TP++;
            if (isTrash) stats.FP++;
        }
        // REVIEW se considera neutro para el calculo de Precision en este test binario
    });

    const precisionDrop = (stats.TN / (stats.TN + stats.FN)) || 0;
    const unicornKillerRate = (stats.UNICORN_KILLS / groundTruth.filter(t => t.real === "WINNER").length) || 0;

    return {
        matrix: stats,
        precisionDrop,
        unicornKillerRate
    };
}
