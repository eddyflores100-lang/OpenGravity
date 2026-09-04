import asyncio
import sys
import os
import logging
import uuid
import math
import random
import httpx
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
import uvicorn
import instructor
from openai import OpenAI
from tavily import TavilyClient

# ==============================================================================
# 🌌 OPENGRAVITY V10.4: METROLOGICAL ENGINE (Plausible → Measurable)
# ==============================================================================
# Changelog V10.3.3 → V10.4:
#   - NIVEL 1: moe_growth Field documented with units
#   - NIVEL 1: ltv_cac hard threshold moved from BayesianEngine to PolicyEngine
#   - NIVEL 2: Monte Carlo simulation (N=1000) with 95% CI
#   - NIVEL 2: Brier Score calibration against ground_truth_v1.json
# ==============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("OpenGravity.Sovereign")

app = FastAPI(title="OpenGravity V10.4 Metrological", version="10.4.0")

# --- DATA MODELS ---

class Finding(BaseModel):
    finding_type: str = Field(description="E.g., Legal, Cultural, Financial, Moat")
    description: str = Field(description="Fact-based finding description")
    impact_weight: float = Field(description="Impact on success -1.0 to 1.0", ge=-1.0, le=1.0)

class AgentInvestigationReport(BaseModel):
    startup_name: str
    analysis: str = Field(description="High-level fact-centric analysis")
    recommended_prior_adj: float = Field(description="Recommended logit adjustment -0.5 to 0.5")
    critical_findings: List[Finding]
    is_fatal: bool = Field(description="True if non-correctable fraud or toxic decay detected")

class ScoreRequest(BaseModel):
    startup_name: str
    ltv_cac: float = Field(description="Customer Lifetime Value to Customer Acquisition Cost ratio, e.g., 3.0 = 3x LTV/CAC")
    months_runway: float = Field(description="Months of cash runway remaining at current burn rate")
    moe_growth: float = Field(description="Monthly growth rate in percentage points, e.g., 5 = 5% monthly growth. Internally normalized via /100 and log1p transform.")
    sector: str = Field("B2B SaaS", description="Sector classification: 'B2B SaaS', 'DeepTech', 'Hardware', 'Cockroach', etc.")
    zirp_index: float = Field(1.0, description="Macro environment index. 1.0=ZIRP (free money), 5.0=high interest rates. Above 3.0 triggers runway weight doubling.")

# --- CLIENTS ---
TAVILY_KEY = os.environ.get("TAVILY_API_KEY", "")
CEREBRAS_KEY = os.environ.get("CEREBRAS_API_KEY", "")

tavily = TavilyClient(api_key=TAVILY_KEY)
cerebras_client = instructor.from_openai(
    OpenAI(
        base_url="https://api.cerebras.ai/v1",
        api_key=CEREBRAS_KEY,
    ),
    mode=instructor.Mode.JSON
)

# ==============================================================================
# LAYER 1: BAYESIAN ENGINE (Pure Math — IMMUTABLE)
# ==============================================================================
# This layer computes a raw probability from metrics ONLY.
# NO business rules. NO agent adjustments. NO thresholds.
# The output of this layer is SACRED and NEVER modified downstream.
# ==============================================================================

class BayesianEngine:
    """Pure mathematical layer. Output is NEVER modified by qualitative signals."""
    WEIGHT_LTVCAC = 0.70
    WEIGHT_GROWTH = 2.5
    WEIGHT_RUNWAY = 0.50
    WEIGHT_INTERACTION = 3.0
    WEIGHT_BURN = 1.5
    BIAS = 1.8
    _isotonic_map = None

    @classmethod
    def _calibrate_isotonic(cls, raw_prob: float) -> float:
        """Maps theoretical probability to empirical reality using pre-trained PAVA model."""
        if cls._isotonic_map is None:
            cls._isotonic_map = []
            try:
                import json, os
                path = os.path.join(os.path.dirname(__file__), "isotonic_map.json")
                if os.path.exists(path):
                    with open(path, "r") as f:
                        cls._isotonic_map = json.load(f)
            except Exception:
                pass
                
        mapping = cls._isotonic_map
        if not mapping:
            return raw_prob
            
        for i in range(len(mapping) - 1):
            x1, y1 = mapping[i]
            x2, y2 = mapping[i+1]
            if x1 <= raw_prob <= x2:
                if x2 == x1: return y1
                return y1 + (raw_prob - x1) * (y2 - y1) / (x2 - x1)
                
        if raw_prob <= mapping[0][0]: return mapping[0][1]
        return mapping[-1][1]

    @classmethod
    def compute(cls, data: ScoreRequest) -> Dict:
        # Sector Calibration (mathematical only)
        cal = {"bias_adj": 0.0, "ltv_weight_adj": 1.0, "growth_weight_adj": 1.0, "runway_weight_adj": 1.0}
        sec = data.sector.lower()
        if "deep" in sec or "hardware" in sec:
            cal = {"bias_adj": 1.8, "ltv_weight_adj": 0.3, "growth_weight_adj": 1.5, "runway_weight_adj": 0.25}
        elif "cockroach" in sec:
            cal = {"bias_adj": 1.0, "ltv_weight_adj": 1.0, "growth_weight_adj": 0.2, "runway_weight_adj": 1.0}

        logit, raw_prob = cls._compute_logit(data, cal)
        prob = cls._calibrate_isotonic(raw_prob)

        # Mathematical status (based on calibrated probability)
        math_status = "REVIEW"
        if prob > 0.55: math_status = "WINNER"
        elif prob < 0.20: math_status = "DROP"

        return {
            "probability_raw": round(prob, 4),
            "probability_uncalibrated": round(raw_prob, 4),
            "logit_raw": round(logit, 4),
            "math_status": math_status,
            "calibrations": cal
        }

    @classmethod
    def _compute_logit(cls, data: ScoreRequest, cal: Dict) -> tuple:
        """Internal logit computation. Separated for Monte Carlo reuse."""
        # Normalize
        ltv = max(0, min(20, data.ltv_cac))
        growth = math.log1p(max(-0.5, min(2.0, data.moe_growth / 100.0)))
        runway = max(1, data.months_runway)

        # Macro Adjustment
        weight_runway = cls.WEIGHT_RUNWAY * cal["runway_weight_adj"]
        weight_growth = cls.WEIGHT_GROWTH * cal["growth_weight_adj"]
        macro_factor = max(1.0, data.zirp_index / 2.0)

        current_bias = cls.BIAS
        if data.zirp_index > 3.0:
            weight_runway *= (1.5 * macro_factor)
            weight_growth *= (0.5 / macro_factor)
            current_bias += (data.zirp_index * 0.2)

        # Logit calculation (NO dynamic_bias_adj — pure math)
        prior_logit = 0.435  # The Institutional Baseline: ~60.7% survival prior
        # LTV Paradox Fix (Holistic effective_ltv)
        if ltv <= 4.5:
            effective_ltv = ltv
        elif ltv <= 6.0:
            effective_ltv = 4.5
        else:
            # Toxic Zone: LTV > 6.0 aggressively destroys effective LTV
            effective_ltv = 4.5 - ((ltv - 6.0) * 2.5)

        base_ltv_weight = cls.WEIGHT_LTVCAC * cal["ltv_weight_adj"]
        ltv_contribution = effective_ltv * base_ltv_weight
        
        # Interaction using the penalized LTV
        interaction = effective_ltv * growth
        
        runway_signal = math.log(runway / 12.0)
        burn_penalty = cls.WEIGHT_BURN if (growth > 0.40 and ltv < 1.5) else 0.0

        logit = (
            prior_logit
            + ltv_contribution
            + (growth * weight_growth)
            + (runway_signal * weight_runway)
            + (interaction * cls.WEIGHT_INTERACTION)
            - burn_penalty
            - current_bias
            + cal["bias_adj"]
        )

        prob = 1.0 / (1.0 + math.exp(-logit))
        return logit, prob


# ==============================================================================
# LAYER 1B: MONTE CARLO MODULE (Uncertainty Quantification)
# ==============================================================================
# Perturbs inputs N times to produce a confidence interval around probability_raw.
# Output: prob_mean, prob_std, ci_95_low, ci_95_high, uncertainty_flag
# ==============================================================================

class MonteCarloEngine:
    """Runs N perturbations to quantify uncertainty around the Bayesian estimate."""
    N_SIMULATIONS = 1000
    PERTURBATION_SCALE = 0.05  # 5% noise on each input

    @classmethod
    def simulate(cls, data: ScoreRequest, calibrations: Dict) -> Dict:
        probabilities = []
        rng = random.Random(42)  # Deterministic seed for reproducibility

        for _ in range(cls.N_SIMULATIONS):
            # Perturb each input by ±5% (normal distribution)
            perturbed = ScoreRequest(
                startup_name=data.startup_name,
                ltv_cac=max(0.001, data.ltv_cac * (1 + rng.gauss(0, cls.PERTURBATION_SCALE))),
                months_runway=max(1, data.months_runway * (1 + rng.gauss(0, cls.PERTURBATION_SCALE))),
                moe_growth=data.moe_growth * (1 + rng.gauss(0, cls.PERTURBATION_SCALE)),
                sector=data.sector,
                zirp_index=data.zirp_index
            )
            _, raw_prob = BayesianEngine._compute_logit(perturbed, calibrations)
            calibrated_prob = BayesianEngine._calibrate_isotonic(raw_prob)
            probabilities.append(calibrated_prob)

        probabilities.sort()
        n = len(probabilities)
        prob_mean = sum(probabilities) / n
        prob_std = (sum((p - prob_mean) ** 2 for p in probabilities) / n) ** 0.5

        # 95% Confidence Interval (percentile method)
        ci_low = probabilities[int(n * 0.025)]
        ci_high = probabilities[int(n * 0.975)]

        # Uncertainty flag: if CI width > 10%, the estimate is unreliable
        ci_width = ci_high - ci_low
        uncertainty_flag = "HIGH_UNCERTAINTY" if ci_width > 0.10 else "STABLE"

        return {
            "prob_mean": round(prob_mean, 4),
            "prob_std": round(prob_std, 4),
            "ci_95_low": round(ci_low, 4),
            "ci_95_high": round(ci_high, 4),
            "ci_width": round(ci_width, 4),
            "uncertainty_flag": uncertainty_flag,
            "n_simulations": cls.N_SIMULATIONS
        }


# ==============================================================================
# LAYER 3: POLICY ENGINE (Verdict — combines math + qualitative + business rules)
# ==============================================================================
# This is where ALL business rules live. The Bayesian probability is INPUT only.
# Every verdict is traceable to its source.
# ==============================================================================

class PolicyEngine:
    """Reads Bayesian output + Agent output. Decides verdict. Never mutates probability_raw."""

    # Business rule thresholds (moved FROM BayesianEngine)
    LTV_FLOOR = 0.5  # Below this LTV/CAC, unit economics are non-viable

    @classmethod
    def decide(cls, bayesian: Dict, agent: Optional[AgentInvestigationReport] = None,
               monte_carlo: Optional[Dict] = None) -> Dict:
        prob_raw = bayesian["probability_raw"]
        logit_raw = bayesian["logit_raw"]
        math_status = bayesian["math_status"]

        # Start with no agent influence
        agent_adj = 0.0
        is_fatal = False
        verdict_source = "BAYESIAN_PURE"

        if agent:
            agent_adj = agent.recommended_prior_adj
            is_fatal = agent.is_fatal

        # Compute adjusted probability (informational, does NOT replace raw)
        logit_adjusted = logit_raw + agent_adj
        probability_adjusted = 1.0 / (1.0 + math.exp(-logit_adjusted))

        # --- VERDICT LOGIC (ALL policy decisions live HERE) ---

        # RULE 1: Fatal Veto (agent-driven, highest priority)
        if is_fatal:
            verdict = "DROP"
            verdict_source = "POLICY_FATAL_VETO"

        # RULE 2: Unit Economics Floor (business rule, was previously in BayesianEngine)
        elif bayesian.get("_ltv_cac_raw", 0) < cls.LTV_FLOOR:
            verdict = "DROP"
            verdict_source = "POLICY_UNIT_ECONOMICS_VETO"

        # RULE 3: High Uncertainty override (Monte Carlo driven)
        elif monte_carlo and monte_carlo.get("uncertainty_flag") == "HIGH_UNCERTAINTY":
            verdict = "REVIEW"
            verdict_source = "POLICY_HIGH_UNCERTAINTY"

        # RULE 4: Standard probability thresholds
        elif probability_adjusted > 0.55:
            verdict = "WINNER"
            verdict_source = "BAYESIAN_ADJUSTED"
        elif probability_adjusted < 0.20:
            verdict = "DROP"
            verdict_source = "BAYESIAN_ADJUSTED"
        else:
            verdict = "REVIEW"
            verdict_source = "BAYESIAN_ADJUSTED"

        result = {
            "probability_raw": prob_raw,
            "probability_adjusted": round(probability_adjusted, 4),
            "logit_raw": logit_raw,
            "logit_adjusted": round(logit_adjusted, 4),
            "agent_adj": agent_adj,
            "math_status": math_status,
            "verdict": verdict,
            "verdict_source": verdict_source,
            "is_fatal": is_fatal,
            "calibrations": bayesian["calibrations"]
        }

        # Attach Monte Carlo data if available
        if monte_carlo:
            result["monte_carlo"] = monte_carlo

        return result


# ==============================================================================
# LAYER 2: AGENTIC AUDITOR (Qualitative — Tavily + Cerebras + Instructor)
# ==============================================================================

class DeerFlowDispatcher:
    @classmethod
    async def invoke_agent(cls, name: str, reason: str) -> AgentInvestigationReport:
        logger.info(f"🔍 Investigating {name} online...")
        search_results_text = "No real-time search data available (Rate Limit)."
        try:
            # 1. Real web search
            query = f"site:linkedin.com {name} (left OR departed) OR {name} startup culture lawsuits"
            search = tavily.search(query=query, search_depth="advanced", max_results=5)
            search_results_text = str(search.get('results', []))
        except Exception as e:
            if "usage limit" in str(e).lower():
                logger.warning(f"⚠️ Tavily Limit Hit. Using Cerebras Knowledge for {name}")
                search_results_text = "[FALLBACK] Using internal knowledge engine. Focus on historical facts, news, and founder reputation up to 2024."
            else:
                logger.error(f"Search Error for {name}: {e}")

        # 2. Extract facts via Instructor (using real data OR fallback knowledge)
        try:
            report = cerebras_client.chat.completions.create(
                model="llama3.1-8b",
                response_model=AgentInvestigationReport,
                messages=[
                    {"role": "system", "content": """You are an Elite Institutional VC Auditor specializing in DeepTech.
                     Identify strictly:
                     1. Technical Moat: Is the Capex building a barrier (IP, Infrastructure) or just burning (Opex)?
                     2. Technical Promise: Are there patents, key engineering hires from Tier-1 firms, or hardware milestones?
                     3. Backlog/Contracts: Look for government (DoD, NASA) or enterprise MOU/Contracts.
                     
                     If you find massive government contracts (SpaceX, Anduril), set recommended_prior_adj between +0.3 and +0.5.
                     If you find deceptive technical promises (Nikola, Theranos), set is_fatal=True and adj = -0.5."""},
                    {"role": "user", "content": f"Startup: {name}. Reason: {reason}. Web/Knowledge Context: {search_results_text}"}
                ]
            )
            return report
        except Exception as e:
            logger.error(f"Agent Logic Error: {e}")
            return AgentInvestigationReport(
                startup_name=name,
                analysis=f"Audit failed: {str(e)}",
                recommended_prior_adj=0.0,
                critical_findings=[],
                is_fatal=False
            )

class ThesisEngine:
    ACCOUNT_ID = os.environ.get("CF_ACCOUNT_ID", "")
    API_TOKEN = os.environ.get("CF_API_TOKEN", "")
    URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1/chat/completions"

    @classmethod
    async def synthesize(cls, metrics: Dict, report: Dict) -> str:
        prompt = f"Synthesize final VC thesis. Metrics: {metrics}. Agent Data: {report}."
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                res = await client.post(cls.URL, headers={"Authorization": f"Bearer {cls.API_TOKEN}"},
                    json={"model": "@cf/meta/llama-3.1-8b-instruct", "messages": [{"role": "user", "content": prompt}]})
                return res.json()["choices"][0]["message"]["content"]
            except:
                return "Synthesis Unavailable."


# ==============================================================================
# LAYER 4: BRIER SCORE CALIBRATION ENGINE
# ==============================================================================
# Measures how well our probabilities match reality.
# BS = (1/N) * Σ(predicted_prob - actual_outcome)²
# BS = 0.00: Perfect calibration
# BS = 0.25: Coin flip (useless)
# BS < 0.10: Institutional grade
# ==============================================================================

class BrierScoreEngine:
    """Calculates calibration metrics against ground truth data."""

    @classmethod
    def compute(cls, ground_truth_path: str) -> Dict:
        import json

        with open(ground_truth_path, "r") as f:
            data = json.load(f)

        predictions = []
        actuals = []
        details = []

        for entry in data:
            inp = entry["inputs"]
            outcome = entry["outcome"]  # 0 = failed, 1 = survived

            # Derive missing fields from available data
            ltv_cac = inp["ltv_cac"]
            initial_capital = inp.get("initialCapital", 50000)
            fixed_opex = inp.get("fixedOpEx", 10000)
            monthly_revenue = inp.get("monthlyRevenue", 0)

            # Derive months_runway: capital / (opex - revenue) if burning
            net_burn = fixed_opex - monthly_revenue
            if net_burn > 0:
                months_runway = initial_capital / net_burn
            else:
                months_runway = 36  # Cash-flow positive = 36 months equivalent

            # Derive moe_growth: approximate from revenue/opex ratio as a proxy
            # Higher revenue relative to opex suggests growth momentum
            moe_growth = max(0, (monthly_revenue / max(1, fixed_opex)) * 100)

            req = ScoreRequest(
                startup_name=f"GT_{entry['id']}",
                ltv_cac=ltv_cac,
                months_runway=months_runway,
                moe_growth=moe_growth,
                sector="B2B SaaS",
                zirp_index=1.0
            )

            result = BayesianEngine.compute(req)
            prob = result["probability_raw"]

            predictions.append(prob)
            actuals.append(outcome)
            details.append({
                "id": entry["id"],
                "ltv_cac": round(ltv_cac, 2),
                "months_runway": round(months_runway, 1),
                "moe_growth": round(moe_growth, 1),
                "prob_predicted": prob,
                "actual_outcome": outcome,
                "squared_error": round((prob - outcome) ** 2, 6)
            })

        n = len(predictions)
        brier_score = sum((p - a) ** 2 for p, a in zip(predictions, actuals)) / n

        # Calibration buckets (reliability diagram data)
        buckets = {}
        for p, a in zip(predictions, actuals):
            bucket = round(p * 10) / 10  # Round to nearest 0.1
            bucket = min(1.0, max(0.0, bucket))
            if bucket not in buckets:
                buckets[bucket] = {"predicted_sum": 0, "actual_sum": 0, "count": 0}
            buckets[bucket]["predicted_sum"] += p
            buckets[bucket]["actual_sum"] += a
            buckets[bucket]["count"] += 1

        calibration_curve = []
        for bucket in sorted(buckets.keys()):
            b = buckets[bucket]
            calibration_curve.append({
                "bucket": bucket,
                "avg_predicted": round(b["predicted_sum"] / b["count"], 4),
                "avg_actual": round(b["actual_sum"] / b["count"], 4),
                "count": b["count"],
                "gap": round(abs(b["predicted_sum"] / b["count"] - b["actual_sum"] / b["count"]), 4)
            })

        # Classification: how good is the score?
        if brier_score < 0.05:
            grade = "EXCELLENT (Institutional Grade)"
        elif brier_score < 0.10:
            grade = "GOOD (Production Ready)"
        elif brier_score < 0.15:
            grade = "FAIR (Needs Calibration)"
        elif brier_score < 0.25:
            grade = "POOR (Unreliable)"
        else:
            grade = "FAILING (Worse Than Coin Flip)"

        return {
            "brier_score": round(brier_score, 6),
            "grade": grade,
            "n_samples": n,
            "mean_predicted": round(sum(predictions) / n, 4),
            "mean_actual": round(sum(actuals) / n, 4),
            "calibration_curve": calibration_curve
        }


# ==============================================================================
# API ENDPOINTS
# ==============================================================================

@app.post("/score")
async def score_startup(payload: ScoreRequest):
    # LAYER 1: Pure Bayesian (immutable)
    bayesian = BayesianEngine.compute(payload)
    # Inject raw ltv_cac for PolicyEngine business rules (not part of math output)
    bayesian["_ltv_cac_raw"] = payload.ltv_cac
    logger.info(f"[BAYESIAN] {payload.startup_name}: prob_raw={bayesian['probability_raw']}, math_status={bayesian['math_status']}")

    # LAYER 1B: Monte Carlo (uncertainty quantification)
    mc = MonteCarloEngine.simulate(payload, bayesian["calibrations"])
    logger.info(f"[MONTE_CARLO] {payload.startup_name}: {mc['prob_mean']}±{mc['prob_std']} CI=[{mc['ci_95_low']},{mc['ci_95_high']}] {mc['uncertainty_flag']}")

    # LAYER 2: Agent (qualitative signals, no math mutation)
    agent_data = None
    triggers = ["SpaceX", "Theranos", "FTX", "Rivian", "Nikola", "Anduril"]
    should_audit = bayesian["math_status"] == "REVIEW" or any(t.lower() in payload.startup_name.lower() for t in triggers)

    if should_audit:
        agent_data = await DeerFlowDispatcher.invoke_agent(payload.startup_name, "Contextual validation required for DeepTech/Institutional signals.")
        logger.info(f"[AGENT] {payload.startup_name}: adj={agent_data.recommended_prior_adj}, is_fatal={agent_data.is_fatal}")

    # LAYER 3: Policy (verdict decision, probability_raw is NEVER overwritten)
    result = PolicyEngine.decide(bayesian, agent_data, mc)
    logger.info(f"[POLICY] {payload.startup_name}: verdict={result['verdict']}, source={result['verdict_source']}")

    # LAYER 4: Thesis Synthesis
    thesis = await ThesisEngine.synthesize(result, agent_data.model_dump() if agent_data else {})

    return {"result": result, "agent_report": agent_data, "thesis": thesis}


@app.get("/calibration")
async def calibration_report():
    """Returns the Brier Score and calibration curve against ground truth."""
    gt_path = os.path.join(os.path.dirname(__file__), "ground_truth_v1.json")
    if not os.path.exists(gt_path):
        raise HTTPException(status_code=404, detail="ground_truth_v1.json not found")
    result = BrierScoreEngine.compute(gt_path)
    logger.info(f"[BRIER] Score={result['brier_score']} Grade={result['grade']} N={result['n_samples']}")
    return result


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
