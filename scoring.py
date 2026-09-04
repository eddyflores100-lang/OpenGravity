import math
from typing import List, Tuple, Optional
from models import ScoreRequest, AgentReport, ScoringResult, LogicTier
from datetime import datetime, timezone


def stable_sigmoid(x: float) -> float:
    """
    Numerically stable sigmoid.

    The naive form 1 / (1 + exp(-x)) raises OverflowError for very
    negative logits (e.g. heavy negative agentic bias). This split
    formulation never overflows: exp() is only ever called on
    non-positive arguments.
    """
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


class OpenGravityEngine:
    """
    Bayesian scoring engine (V10.5).

    Produces a calibrated P(Hit) from unit economics via a logistic
    model, optionally corrected by agentic signals that act directly
    on the logit scale.
    """

    VERSION = "10.5.0"

    # Bayesian Prior & Weights (V10 Calibrated from Truth Monolith V9.7.1)
    COEFFICIENTS = {
        "ltv_cac": 0.70,
        "growth": 2.50,
        "runway": 0.50,
        "interaction": 3.0,
        "burn_penalty": 1.5,
        "bias": 1.8,
    }

    # Decision thresholds (V10 calibration)
    INVEST_THRESHOLD = 0.55
    WINNER_THRESHOLD = 0.80
    DROP_THRESHOLD = 0.25
    CRITICAL_BIAS = -2.0

    # Survival prior when no agent report is available
    SURVIVAL_HIGH = 0.9
    SURVIVAL_LOW = 0.3

    @classmethod
    def calculate_logit(
        cls, request: ScoreRequest, agent_report: Optional[AgentReport] = None
    ) -> Tuple[float, float]:
        """Calculates the raw logit and the sum of agent-applied biases."""
        m = request.metrics

        # 1. Base Logic (Calibrated V9.7.1)
        ltv = max(0, min(20, m.ltv_cac))
        growth = math.log1p(max(-0.5, min(2.0, m.moe_growth / 100.0)))
        runway = max(1, m.months_runway)

        # Interaction signal (LTV * Growth synergy)
        interaction = ltv * growth

        # Burn penalty: high growth + low LTV
        burn_penalty = (
            cls.COEFFICIENTS["burn_penalty"]
            if (growth > 0.40 and ltv < 1.5)
            else 0.0
        )

        # Log-normalized runway signal
        runway_signal = math.log(runway / 12.0)

        # Base prior logit (p=0.20)
        prior_logit = -1.386

        base_logit = (
            prior_logit
            + (ltv * cls.COEFFICIENTS["ltv_cac"])
            + (growth * cls.COEFFICIENTS["growth"])
            + (runway_signal * cls.COEFFICIENTS["runway"])
            + (interaction * cls.COEFFICIENTS["interaction"])
            - burn_penalty
            - cls.COEFFICIENTS["bias"]
        )

        # 2. Agentic Bias Injection (Direct offset from agents)
        agent_bias_sum = 0.0
        if agent_report:
            for signal in agent_report.signals:
                agent_bias_sum += signal.impact_magnitude

        final_logit = base_logit + agent_bias_sum
        return final_logit, agent_bias_sum

    @classmethod
    def get_confidence_interval(cls, prob: float, is_audited: bool) -> List[float]:
        """Returns the [min, max] probability range based on data veracity."""
        # Audit data has a tight spread (+/- 5%)
        # Agent/Inferred data has a wide spread (+/- 15%)
        spread = 0.05 if is_audited else 0.15
        return [max(0.0, prob - spread), min(1.0, prob + spread)]

    @classmethod
    def evaluate(
        cls, request: ScoreRequest, agent_report: Optional[AgentReport] = None
    ) -> ScoringResult:
        logit, agent_bias = cls.calculate_logit(request, agent_report)

        # Stable sigmoid to probability (never overflows)
        prob = stable_sigmoid(logit)

        # Confidence Range
        ci = cls.get_confidence_interval(prob, request.metrics.is_audited)

        # Survival Indicator (24m)
        survival = (
            agent_report.estimated_survival_prob_24m
            if agent_report
            else (cls.SURVIVAL_HIGH if prob > 0.5 else cls.SURVIVAL_LOW)
        )

        # Determine Status (V10 Thresholds)
        if request.metrics.ltv_cac < 1.0:
            status = "DROP"
        elif prob > cls.WINNER_THRESHOLD:
            status = "WINNER"
        elif prob > cls.INVEST_THRESHOLD:
            status = "INVEST"
        elif prob < cls.DROP_THRESHOLD:
            status = "DROP"
        else:
            status = "REVIEW"

        # Adaptive formatting: if there's a heavy negative bias, flag the status
        if agent_bias < cls.CRITICAL_BIAS:
            status = f"CRITICAL {status}"

        return ScoringResult(
            probability_hit=round(prob, 4),
            confidence_interval=[round(x, 4) for x in ci],
            logit_score=round(logit, 4),
            status=status,
            down_round_risk_24m=round(1.0 - survival, 4),
            agent_bias_applied=round(agent_bias, 4),
        )
