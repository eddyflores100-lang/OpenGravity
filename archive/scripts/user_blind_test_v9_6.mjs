/**
 * OpenGravity V9.6.1 — USER BLIND TEST RUNNER (FIXED)
 */
import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';

const USER_DATASET = [
  { "id": 1, "name": "A1", "ltv_cac": 4.8, "runway": 12, "moe": 75 },
  { "id": 2, "name": "A2", "ltv_cac": 0.9, "runway": 10, "moe": 85 },
  { "id": 3, "name": "A3", "ltv_cac": 2.2, "runway": 8, "moe": 55 },
  { "id": 4, "name": "A4", "ltv_cac": 1.1, "runway": 6, "moe": 70 },
  { "id": 5, "name": "A5", "ltv_cac": 6.5, "runway": 14, "moe": 80 },
  { "id": 6, "name": "A6", "ltv_cac": 1.4, "runway": 18, "moe": 40 },
  { "id": 7, "name": "A7", "ltv_cac": 3.1, "runway": 9, "moe": 60 },
  { "id": 8, "name": "A8", "ltv_cac": 0.7, "runway": 15, "moe": 90 },
  { "id": 9, "name": "A9", "ltv_cac": 5.2, "runway": 11, "moe": 78 },
  { "id": 10, "name": "A10", "ltv_cac": 1.3, "runway": 5, "moe": 65 },
  { "id": 11, "name": "B1", "ltv_cac": 2.8, "runway": 7, "moe": 50 },
  { "id": 12, "name": "B2", "ltv_cac": 0.6, "runway": 20, "moe": 95 },
  { "id": 13, "name": "B3", "ltv_cac": 7.0, "runway": 16, "moe": 82 },
  { "id": 14, "name": "B4", "ltv_cac": 1.2, "runway": 4, "moe": 60 },
  { "id": 15, "name": "B5", "ltv_cac": 3.6, "runway": 10, "moe": 68 },
  { "id": 16, "name": "B6", "ltv_cac": 1.0, "runway": 12, "moe": 72 },
  { "id": 17, "name": "B7", "ltv_cac": 4.2, "runway": 13, "moe": 77 },
  { "id": 18, "name": "B8", "ltv_cac": 0.8, "runway": 9, "moe": 88 },
  { "id": 19, "name": "B9", "ltv_cac": 2.0, "runway": 6, "moe": 52 },
  { "id": 20, "name": "B10", "ltv_cac": 5.5, "runway": 15, "moe": 83 },
  { "id": 21, "name": "C1", "ltv_cac": 1.6, "runway": 24, "moe": 30 },
  { "id": 22, "name": "C2", "ltv_cac": 0.5, "runway": 8, "moe": 92 },
  { "id": 23, "name": "C3", "ltv_cac": 6.8, "runway": 12, "moe": 85 },
  { "id": 24, "name": "C4", "ltv_cac": 1.1, "runway": 7, "moe": 58 },
  { "id": 25, "name": "C5", "ltv_cac": 3.9, "runway": 11, "moe": 74 },
  { "id": 26, "name": "C6", "ltv_cac": 0.9, "runway": 14, "moe": 89 },
  { "id": 27, "name": "C7", "ltv_cac": 2.5, "runway": 10, "moe": 62 },
  { "id": 28, "name": "C8", "ltv_cac": 7.5, "runway": 18, "moe": 90 },
  { "id": 29, "name": "C9", "ltv_cac": 1.2, "runway": 5, "moe": 67 },
  { "id": 30, "name": "C10", "ltv_cac": 4.5, "runway": 13, "moe": 79 }
];

function runTest() {
    const results = USER_DATASET.map(data => {
        const inputs = { 
            ltv_cac: data.ltv_cac, 
            runway: data.runway, // FIX: Inyectamos runway en inputs
            growth_rate: (data.moe / 100) * 0.2, 
            monthly_revenue: 10000 
        };
        const sim = { id: data.id, inputs };
        const posterior = computePosterior(0.1, sim);
        const decision = applyDecisionPolicy(posterior, sim);
        
        return { id: data.id, verdict: decision.verdict };
    });
    
    console.log(JSON.stringify(results, null, 2));
}

runTest();
