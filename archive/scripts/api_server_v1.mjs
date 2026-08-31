/**
 * OpenGravity API v9.6 — THE ACTIONABLE FILTER
 * ═══════════════════════════════════════════════════════════════════
 * PUBLIC ENDPOINT: /evaluate
 * INPUTS: LTV/CAC, Runway, Revenue, Growth.
 * OUTPUT: Action (DROP | REVIEW | INVEST).
 * ═══════════════════════════════════════════════════════════════════
 */

import express from 'express';
import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';
import { simulateOutcome } from './data_engine_v1.mjs';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/api/v1/evaluate', async (req, res) => {
    try {
        const { 
            name, 
            ltv_cac, 
            runway_months, 
            monthly_revenue, 
            growth_rate, 
            moeScore 
        } = req.body;

        // Validation Layer
        if (!ltv_cac || !runway_months) {
            return res.status(400).json({ error: "Missing mandatory fields: ltv_cac, runway_months" });
        }

        const inputs = { 
            ltv_cac, 
            growth_rate: growth_rate || 0.0, 
            monthly_revenue: monthly_revenue || 0 
        };

        const runsCount = 100;
        const runs = Array.from({ length: runsCount }, () => simulateOutcome(inputs, 'NORMAL'));
        const bankruptcyRate = runs.filter(r => r.outcome === 0).length / runsCount;
        
        const sim = { bankruptcyRate, runway: runway_months, inputs, runs };
        const post = computePosterior(moeScore || 50, sim);
        const decision = applyDecisionPolicy(post, sim);

        // ACTIONABLE JSON RESPONSE (V9.6)
        res.json({
            startup: name || "Anonymous Lead",
            action: decision.action, // THE KEY FIELD
            verdict: decision.verdict,
            riskProfile: decision.primaryRisk,
            score: decision.expectedValue,
            confidence: decision.confidence,
            summary: decision.note
        });

    } catch (error) {
        res.status(500).json({ error: "Analysis failed. Ensure numeric inputs." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 OpenGravity V9.6 ACTIONABLE API active on port ${PORT}`);
    console.log(`Endpoint: POST http://localhost:${PORT}/api/v1/evaluate`);
});
