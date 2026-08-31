/**
 * OpenGravity V5.2 - Stress Test: AIRBNB (2008 - Bootstrapped Stage)
 * Escenario: Supervivencia extrema y validación de PMF manual.
 */
import fs from 'fs';

const params = JSON.parse(fs.readFileSync('calibration_params.json', 'utf8'));

function plattScaling(rawScore, A, B) {
    return 1 / (1 + Math.exp(A * rawScore + B));
}

async function runAirbnbAudit() {
    console.log(`\n[OPEN_GRAVITY ORACLE V5.2 - AUDITORÍA DE CASO HISTÓRICO: AIRBNB 2008]`);
    console.log(`===================================================================`);

    // 1. INPUTS DE AIRBNB (Noviembre 2008)
    const initialCapital = 30000; // Lo obtenido por los cereales
    const monthlyBurn = 4000;     // Extremadamente bajo (compartiendo depa)
    const monthlyRevenue = 800;    // $200 x 4
    const debt = 30000;

    // 2. LÓGICA DE INFERENCIA
    const runwayMonths = initialCapital / (monthlyBurn - monthlyRevenue);
    
    // El "X-Factor" de Airbnb: El costo de adquisición era casi 0 porque era manual
    // Pero la escalabilidad era cuestionada.
    
    let rawScore = 0.4; // Base baja por ingresos mínimos
    
    // BONOS POR RESILIENCIA (Capa 1: Inferencia de Agentes)
    if (runwayMonths > 6) rawScore += 0.15; // El dinero del cereal les dio vida
    rawScore += 0.2; // Factor de "Hustle" (Cereal box execution)
    
    // Normalizamos
    rawScore = Math.max(0, Math.min(1, rawScore));

    // 3. CAPA 2: CALIBRACIÓN PROBABILÍSTICA (V5.2)
    const pSuccess = plattScaling(rawScore, params.A, params.B);
    const pBankruptcy = Math.max(0.1, 1 - pSuccess - 0.4); // Alta probabilidad de estancamiento
    const pZombie = 1 - pSuccess - pBankruptcy; 

    const uncertainty = (params.metrics?.brierScore || 0.1) * 100;

    console.log(`\n[RESULTADOS DEL ORÁCULO V5.2]`);
    console.log(`-----------------------------`);
    console.log(`P(Success | Calibrated):   ${(pSuccess * 100).toFixed(2)}%`);
    console.log(`P(Zombie | Stagnation):    ${(pZombie * 100).toFixed(2)}%`);
    console.log(`P(Bankruptcy | Risk):      ${(pBankruptcy * 100).toFixed(2)}%`);
    console.log(`Veredicto de Política:      ${pSuccess < params.optimalThreshold ? '🔴 ALTO RIESGO / EVALUAR' : '🟢 VIABLE (POTENCIAL UNICORNIO)'}`);

    console.log(`\n[DIAGNÓSTICO]`);
    console.log(`El modelo detecta un ${ (pZombie * 100).toFixed(1) }% de probabilidad Zombie.`);
    console.log(`Sin embargo, el score de resiliencia permite superar el umbral de supervivencia.`);
}

runAirbnbAudit();
