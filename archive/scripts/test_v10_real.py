import sys
import os

# Add current dir to path
sys.path.append(os.getcwd())

from models import ScoreRequest, AssetMetrics, AgentReport, AgentSignal, SignalPolarity, LogicTier
from scoring import OpenGravityEngine

def run_production_test():
    print("="*60)
    print("V10 PRODUCTION ENGINE: WEIGHTED BIAS VALIDATION")
    print("="*60)

    # 1. Caso BOLT (En 2021)
    # Crecimiento alto pero cultura tóxica detectada por agente
    bolt_req = ScoreRequest(
        startup_name="Bolt",
        metrics=AssetMetrics(ltv_cac=2.0, months_runway=24, moe_growth=60, is_audited=False),
        tier=LogicTier.SERIES_B
    )
    
    # El agente inyecta un sesgo negativo pero NO lo mata al 1%
    bolt_agent = AgentReport(
        task_id="bolt_research_001",
        summary="Aggressive sales culture, friction with competitors.",
        signals=[AgentSignal(finding="Toxic Internal Culture", impact_magnitude=-2.5, polarity=SignalPolarity.NEGATIVE)]
    )

    res_bolt = OpenGravityEngine.evaluate(bolt_req, bolt_agent)
    print(f"Asset: BOLT | P(Hit): {res_bolt.probability_hit*100:.2f}% | Status: {res_bolt.status} | CI: {res_bolt.confidence_interval}")

    # 2. Caso WEWORK (En su peor momento)
    # El agente inyecta un sesgo CATASTRÓFICO
    wework_req = ScoreRequest(
        startup_name="WeWork",
        metrics=AssetMetrics(ltv_cac=1.2, months_runway=6, moe_growth=40, is_audited=False),
        tier=LogicTier.LATE_STAGE
    )
    
    wework_agent = AgentReport(
        task_id="wework_research_999",
        summary="Fraudulent governance and cash burning machine.",
        signals=[
            AgentSignal(finding="Governance Failure", impact_magnitude=-4.5, polarity=SignalPolarity.NEGATIVE),
            AgentSignal(finding="Unit Econ Collapse", impact_magnitude=-2.0, polarity=SignalPolarity.NEGATIVE)
        ]
    )

    res_we = OpenGravityEngine.evaluate(wework_req, wework_agent)
    print(f"Asset: WEWORK | P(Hit): {res_we.probability_hit*100:.2f}% | Status: {res_we.status} | CI: {res_we.confidence_interval}")

    # 3. Caso DEEL (Winner con datos auditados)
    deel_req = ScoreRequest(
        startup_name="Deel",
        metrics=AssetMetrics(ltv_cac=4.5, months_runway=40, moe_growth=350, is_audited=True),
        tier=LogicTier.SERIES_A
    )
    res_deel = OpenGravityEngine.evaluate(deel_req)
    print(f"Asset: DEEL | P(Hit): {res_deel.probability_hit*100:.2f}% | Status: {res_deel.status} | CI: {res_deel.confidence_interval}")
    print("="*60)

if __name__ == "__main__":
    run_production_test()
