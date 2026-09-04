/**
 * OpenGravity Data Engine V8 FINAL — Stochastic Event Engine
 * ═══════════════════════════════════════════════════════════════════
 * IMPLEMENTACIÓN: Discontinuidades, Black Swans y Severidad Temporal.
 * ═══════════════════════════════════════════════════════════════════
 */

export const MARKET_REGIMES = {
    NORMAL: { growthMult: 1.0, costMult: 1.0, churnBase: 0.05 },
    BULL_HYPE: { growthMult: 1.8, costMult: 1.5, churnBase: 0.03 },
    BEAR_MARKET: { growthMult: 0.6, costMult: 0.8, churnBase: 0.08 },
    LIQUIDITY_CRUNCH: { growthMult: 0.3, costMult: 2.0, churnBase: 0.12 }
};

function applyExogenousEvents(state) {
    const r = Math.random();
    if (r < 0.08) { state.cash += 500000; state.revenue *= 1.2; } // Funding
    else if (r < 0.13) { state.revenue *= 0.4; } // Black Swan Neg
    else if (r < 0.16) { state.revenue *= 2.5; } // Virality Shock
    else if (r < 0.18) { state.revenue *= 0.6; state.costs *= 1.5; } // Regulatory Hit
    return state;
}

export function simulateOutcome(inputs, regimeKey = 'NORMAL') {
    const regime = MARKET_REGIMES[regimeKey] || MARKET_REGIMES.NORMAL;
    let state = {
        revenue: inputs.monthlyRevenue || 10000,
        cash: inputs.initialCapital || 100000,
        costs: inputs.fixedOpEx || 5000
    };

    for (let month = 0; month < 24; month++) {
        state = applyExogenousEvents(state); // DISCONTINUIDAD V8

        const growth = (state.revenue * (inputs.ltv_cac / 15)) * regime.growthMult;
        state.revenue += (growth - (state.revenue * regime.churnBase));
        state.cash -= (state.costs * (month < 6 ? 1.0 : 1.2));

        if (state.cash <= 0) {
            return { 
                outcome: 0, 
                month, 
                severity: 1 - (month / 24) // RIESGO TEMPORAL V8
            };
        }
    }
    return { outcome: 1, month: 24, severity: 0 };
}
