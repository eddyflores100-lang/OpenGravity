import os
import uuid
import logging
from collections import OrderedDict

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ScoreRequest, AgentReport, ScoringResult
from scoring import OpenGravityEngine
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OpenGravityV10")

app = FastAPI(
    title="OpenGravity V10 Institutional Oracle",
    version=OpenGravityEngine.VERSION,
    description="Bayesian + Monte Carlo + Agentic AI scoring engine for startup due diligence.",
)

# --- CORS ---
# Configure allowed origins via CORS_ORIGINS env var (comma-separated).
# Wildcard origins cannot be combined with credentials (CORS spec).
_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
_allow_credentials = _origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory evaluation store (bounded, LRU-style) ---
# NOTE: state is lost on restart. For production deployments back this
# with Redis or a database (see roadmap in README).
MAX_EVALUATIONS = 1000
EVALUATIONS: "OrderedDict[str, dict]" = OrderedDict()

# Public base URL agents use to call us back
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://host.docker.internal:8000")

# DeerFlow Config (Nginx at port 2026)
DEERFLOW_URL = os.environ.get("DEERFLOW_URL", "http://localhost:2026/api/langgraph/investigate")


async def dispatch_deerflow_investigation(evaluation_id: str, startup_name: str, sector: str):
    """
    Background Task: Dispatches an agentic research mission to DeerFlow.
    DeerFlow will scrape, reason, and eventually call back
    /callback/agent-report/{evaluation_id}.
    """
    logger.info("🚀 Dispatched DeerFlow investigation for %s (eval=%s)...", startup_name, evaluation_id)

    payload = {
        "evaluation_id": evaluation_id,
        "startup_name": startup_name,
        "sector": sector,
        "callback_url": f"{PUBLIC_BASE_URL}/callback/agent-report/{evaluation_id}",
        "depth": "deep_due_diligence",
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(DEERFLOW_URL, json=payload, timeout=30.0)
            if response.status_code == 200:
                logger.info("✅ Mission accepted by DeerFlow for %s", startup_name)
            else:
                logger.error("❌ DeerFlow rejected mission: %s - %s", response.status_code, response.text)
    except Exception as e:  # noqa: BLE001 — background task must never crash the app
        logger.error("⚠️ Error reaching DeerFlow: %s", e)


@app.post("/score", response_model=ScoringResult)
async def score_startup(request: ScoreRequest, background_tasks: BackgroundTasks):
    """
    Primary endpoint: Returns the initial Bayesian score.

    Triggers an autonomous investigation if P(Hit) is in the 'Review'
    or 'Invest' zone. The response carries an `evaluation_id` that
    agents must use when calling back with new evidence.
    """
    result = OpenGravityEngine.evaluate(request)

    evaluation_id = str(uuid.uuid4())
    result.evaluation_id = evaluation_id

    EVALUATIONS[evaluation_id] = {
        "evaluation_id": evaluation_id,
        "request": request,
        "initial_result": result,
    }
    # Bound memory usage: evict oldest entries
    while len(EVALUATIONS) > MAX_EVALUATIONS:
        EVALUATIONS.popitem(last=False)

    # If score is in the uncertainty band, we need more context
    if 0.15 <= result.probability_hit <= 0.85:
        background_tasks.add_task(
            dispatch_deerflow_investigation, evaluation_id, request.startup_name, request.sector
        )
        result.status = f"{result.status} (AGENT_DISPATCHED)"

    return result


@app.post("/callback/agent-report/{evaluation_id}")
async def process_agent_report(evaluation_id: str, report: AgentReport):
    """
    Webhook for DeerFlow/MiroFish agents.
    Updates the score with weighted biases from qualitatively discovered signals.
    """
    entry = EVALUATIONS.get(evaluation_id)
    if entry is None:
        logger.warning("Unexpected callback for evaluation %s", evaluation_id)
        raise HTTPException(status_code=404, detail="Evaluation not found or expired")

    original_request: ScoreRequest = entry["request"]
    updated_result = OpenGravityEngine.evaluate(original_request, report)
    updated_result.evaluation_id = evaluation_id

    entry["updated_result"] = updated_result
    entry["agent_summary"] = report.summary
    entry["signals_discovered"] = len(report.signals)

    logger.info(
        "📈 Updated score for %s: %.2f%%",
        original_request.startup_name,
        updated_result.probability_hit * 100,
    )
    return {
        "status": "SUCCESS",
        "evaluation_id": evaluation_id,
        "new_probability": updated_result.probability_hit,
    }


@app.get("/evaluations/{evaluation_id}")
async def get_evaluation(evaluation_id: str):
    """Retrieve the current state of an evaluation (initial + agent updates)."""
    entry = EVALUATIONS.get(evaluation_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Evaluation not found or expired")
    return {
        "evaluation_id": evaluation_id,
        "startup_name": entry["request"].startup_name,
        "initial_result": entry["initial_result"],
        "updated_result": entry.get("updated_result"),
        "agent_summary": entry.get("agent_summary"),
        "signals_discovered": entry.get("signals_discovered", 0),
    }


@app.get("/health")
async def health():
    return {
        "status": "Institutional Oracle Active",
        "version": OpenGravityEngine.VERSION,
        "evaluations_in_memory": len(EVALUATIONS),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
