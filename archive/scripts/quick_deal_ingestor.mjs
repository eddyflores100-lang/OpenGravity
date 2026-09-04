/**
 * OpenGravity V9.6 — QUICK DEAL INGESTOR
 * ═══════════════════════════════════════════════════════════════════
 * USO: Copia datos de AngelList/StartupHub y ejecútalo.
 * OBJETIVO: Generar evidencia real para el lanzamiento.
 * ═══════════════════════════════════════════════════════════════════
 */

import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';
import { simulateOutcome } from './data_engine_v1.mjs';

// --- PEGA AQUÍ LOS DATOS DEL DEAL ---
const REAL_DEAL = {
    name: "Nombre de la Startup",
    ltv_cac: 2.5,        // Estimado o real
    runway_months: 8,    // Según funding o burn
    monthly_revenue: 15000,
    growth_rate: 0.12,   // 12% MoM
    moeScore: 75,        // Tu juicio técnico sobre el equipo/stack
    marketRegime: 'NORMAL' 
};
// ------------------------------------

async function runQuickAudit() {
    const inputs = { 
        ltv_cac: REAL_DEAL.ltv_cac, 
        growth_rate: REAL_DEAL.growth_rate, 
        monthly_revenue: REAL_DEAL.monthly_revenue 
    };

    const runs = Array.from({ length: 100 }, () => simulateOutcome(inputs, REAL_DEAL.marketRegime));
    const bankruptcyRate = runs.filter(r => r.outcome === 0).length / 100;
    
    const sim = { bankruptcyRate, runway: REAL_DEAL.runway_months, inputs, runs };
    const post = computePosterior(REAL_DEAL.moeScore, sim);
    const decision = applyDecisionPolicy(post, sim);

    console.log(`\n--- 🧨 DEAL KILLER CARD: ${REAL_DEAL.name} ---`);
    console.log(`ACTION:      [ ${decision.action} ]`);
    console.log(`VERDICT:     ${decision.verdict}`);
    console.log(`KILL SWITCH: ${decision.killSwitch ? '🔥 ACTIVE' : '✅ inactive'}`);
    console.log(`PRIMARY RISK: ${decision.primaryRisk}`);
    console.log(`SCORE:       ${decision.expectedValue}`);
    console.log(`------------------------------------------`);
    console.log(`EXECUTIVE NOTE: ${decision.note}\n`);
}

runQuickAudit();
