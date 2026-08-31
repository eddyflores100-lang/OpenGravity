/**
 * 🕵️ INTERNAL AUDIT: OPENGRAVITY PROJECT
 * Engine: V9.6 (The Actionable Engine)
 * Mission: Is it a viable SaaS or just Hype?
 */
import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';
import { simulateOutcome } from './data_engine_v1.mjs';

async function auditSelf() {
    const inputs = { 
        ltv_cac: 5.0, 
        runway_months: 24, 
        monthly_revenue: 0, 
        growth_rate: 0.10 // Supongamos una tracción inicial moderada
    };

    // Simulamos en un entorno de prudencia (BEAR_MARKET)
    const runs = Array.from({ length: 100 }, () => simulateOutcome(inputs, 'BEAR_MARKET'));
    const bankruptcyRate = runs.filter(r => r.outcome === 0).length / 100;
    
    const sim = { bankruptcyRate, runway: 24, inputs, runs };
    const post = computePosterior(95, sim); // 95% Confianza técnica
    const decision = applyDecisionPolicy(post, sim);

    console.log("# 🕵️ AUDITORÍA INTERNA: PROYECTO OPENGRAVITY");
    console.log("------------------------------------------");
    console.log(`ENTITY:   OpenGravity SaaS`);
    console.log(`VERDICT:  ${decision.verdict}`);
    console.log(`ACTION:   ${decision.action}`);
    console.log(`SCORE:    ${decision.expectedValue}`);
    console.log(`RISK:     ${decision.primaryRisk}`);
    console.log("------------------------------------------");
    console.log(`THESIS:   ${decision.note}`);
    
    if (decision.action === "INVEST") {
        console.log("\n🚀 RESULTADO: PROBABILIDAD DE VENTA REAL.");
        console.log("El motor confirma que la propuesta de valor es estructuralmente sólida.");
    } else {
        console.log("\n⚠️ RESULTADO: RIESGO DE HUMO.");
        console.log("El motor sugiere ajustes antes del despliegue comercial.");
    }
}

auditSelf();
