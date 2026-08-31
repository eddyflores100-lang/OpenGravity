from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional
from enum import Enum
from datetime import datetime, timezone


def _utcnow() -> datetime:
    """Timezone-aware UTC now (datetime.utcnow is deprecated since 3.12)."""
    return datetime.now(timezone.utc)


class LogicTier(str, Enum):
    SEED = "Seed"
    SERIES_A = "Series A"
    SERIES_B = "Series B"
    LATE_STAGE = "Late Stage"


class SignalPolarity(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


# --- INPUT DATA ---
class AssetMetrics(BaseModel):
    ltv_cac: float = Field(
        ..., ge=0.0, description="Customer Lifetime Value to Acquisition Cost"
    )
    months_runway: float = Field(..., ge=0.0, description="Cash on hand in months")
    moe_growth: float = Field(
        ..., ge=0.0, description="Month-over-month growth percentage"
    )
    is_audited: bool = Field(
        False,
        description="Whether data comes from 10-K/Audit (tight CI) or Agent inference (wide CI)",
    )


class ScoreRequest(BaseModel):
    startup_name: str
    metrics: AssetMetrics
    tier: LogicTier = LogicTier.SERIES_A
    sector: str = "B2B SaaS"

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "startup_name": "NeuralNet Corp",
                    "metrics": {
                        "ltv_cac": 5.5,
                        "months_runway": 18,
                        "moe_growth": 20,
                        "is_audited": False,
                    },
                    "tier": "Series A",
                    "sector": "B2B SaaS",
                }
            ]
        }
    }


# --- AGENTIC INPUTS ---
class AgentEvidence(BaseModel):
    source: str
    url: Optional[HttpUrl] = None
    credibility: float = Field(0.9, ge=0.0, le=1.0)


class AgentSignal(BaseModel):
    finding: str
    impact_magnitude: float = Field(
        ...,
        ge=-5.0,
        le=5.0,
        description="Weight added to the Logit, not the probability directly",
    )
    polarity: SignalPolarity
    evidence: List[AgentEvidence] = []


class AgentReport(BaseModel):
    task_id: str
    signals: List[AgentSignal] = []
    summary: str
    estimated_survival_prob_24m: float = Field(0.5, ge=0.0, le=1.0)


# --- OUTPUT RESULTS ---
class ScoringResult(BaseModel):
    evaluation_id: Optional[str] = Field(
        None, description="Unique evaluation handle used for agent callbacks"
    )
    probability_hit: float
    confidence_interval: List[float] = Field(..., min_length=2, max_length=2)
    logit_score: float
    status: str
    down_round_risk_24m: float
    agent_bias_applied: float
    timestamp: datetime = Field(default_factory=_utcnow)
