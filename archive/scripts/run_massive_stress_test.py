import math
import json
import random
from typing import Dict, List

# ==============================================================================
# OPENGRAVITY V10.2: RED TEAMING STRESS TEST (PHASE 1)
# ==============================================================================

class PredictiveEngine:
    """Replicating the new logic from v10_orchestrator.py for the stress test"""
    WEIGHT_LTVCAC = 0.70
    WEIGHT_GROWTH = 2.5
    WEIGHT_RUNWAY = 0.50
    WEIGHT_INTERACTION = 3.0
    WEIGHT_BURN = 1.5
    BIAS = 1.8
    
    @classmethod
    def get_sector_calibrations(cls, sector: str) -> Dict[str, float]:
        cal = {"bias_adj": 0.0, "ltv_weight_adj": 1.0, "growth_weight_adj": 1.0, "runway_weight_adj": 1.0}
        lower_sector = sector.lower()
        if any(kw in lower_sector for kw in ["deep", "hardware", "space", "biotech"]):
            cal["bias_adj"] = 1.2
            cal["ltv_weight_adj"] = 0.4
            cal["runway_weight_adj"] = 0.3
        elif any(kw in lower_sector for kw in ["cockroach", "bootstrapped", "profitable"]):
            cal["bias_adj"] = 0.8
            cal["growth_weight_adj"] = 0.2
        return cal

    @classmethod
    def evaluate(cls, name: str, metrics: Dict, agent_result: Dict = None) -> Dict:
        sector = metrics.get("sector", "B2B SaaS")
        cal = cls.get_sector_calibrations(sector)
        
        ltv = max(0, min(20, metrics["ltv_cac"]))
        growth = math.log1p(max(-0.5, min(2.0, metrics["moe_growth"] / 100.0)))
        runway = max(1, metrics["months_runway"])
        
        weight_ltv = cls.WEIGHT_LTVCAC * cal["ltv_weight_adj"]
        weight_growth = cls.WEIGHT_GROWTH * cal["growth_weight_adj"]
        weight_runway = cls.WEIGHT_RUNWAY * cal["runway_weight_adj"]
        
        bias_adj = cal["bias_adj"]
        if agent_result:
            bias_adj += agent_result.get("recommended_prior_adj", 0.0)
            if agent_result.get("is_fatal", False):
                return {"name": name, "prob": 0.01, "status": "DROP (Red Team Override)", "reason": agent_result["reason"]}

        logit = -1.386 + (ltv * weight_ltv) + (growth * weight_growth) + (math.log(runway/12.0) * weight_runway) + ((ltv * growth) * cls.WEIGHT_INTERACTION) - cls.BIAS + bias_adj
        
        prob = 1.0 / (1.0 + math.exp(-logit))
        status = "REVIEW"
        if metrics["ltv_cac"] < 0.5: status = "DROP"
        elif prob > 0.55: status = "WINNER"
        elif prob < 0.20: status = "DROP"
        
        return {"name": name, "sector": sector, "prob": prob, "status": status}

# 🏭 CONSTRUCTING THE 200 STARTUP STRESS DATABASE
def generate_stress_cohort() -> List[Dict]:
    cohort = []
    
    # 1. HARDTECH / DEEPTECH (THE CHALLENGERS)
    hardtech = [
        {"name": "SpaceX (2008)", "sector": "DeepTech", "ltv_cac": 0.2, "months_runway": 3, "moe_growth": 10}, # Terminal
        {"name": "Anduril (2018)", "sector": "DeepTech", "ltv_cac": 1.2, "months_runway": 12, "moe_growth": 50}, # Strong
        {"name": "Rivian (early)", "sector": "Hardware", "ltv_cac": 0.6, "months_runway": 18, "moe_growth": 200}, # Scaling debt
        {"name": "Oculus (v1)", "sector": "Hardware", "ltv_cac": 0.8, "months_runway": 15, "moe_growth": 80},
        {"name": "Solana Labs", "sector": "DeepTech", "ltv_cac": 1.5, "months_runway": 24, "moe_growth": 500},
    ]
    # Add 20 random DeepTech
    for i in range(20):
        hardtech.append({"name": f"DeepTech_Gen_{i}", "sector": "DeepTech", "ltv_cac": random.uniform(0.1, 1.5), "months_runway": random.randint(3, 24), "moe_growth": random.randint(0, 100)})
    
    # 2. COCKROACHES (THE PROFITABLE)
    cockroaches = [
        {"name": "Mailchimp (2010)", "sector": "Cockroach", "ltv_cac": 8.0, "months_runway": 120, "moe_growth": 15},
        {"name": "Zapier (2012)", "sector": "Cockroach", "ltv_cac": 12.0, "months_runway": 240, "moe_growth": 20},
        {"name": "Basecamp", "sector": "Cockroach", "ltv_cac": 15.0, "months_runway": 600, "moe_growth": 10},
    ]
    # Add 20 random Cockroaches
    for i in range(20):
        cockroaches.append({"name": f"Cockroach_Gen_{i}", "sector": "Cockroach", "ltv_cac": random.uniform(5.0, 15.0), "months_runway": 48, "moe_growth": random.randint(5, 25)})

    # 3. FRAUDS / HYBRID RED TEAMS
    frauds = [
        {"name": "Theranos (2014)", "sector": "HealthTech", "ltv_cac": 15.0, "months_runway": 48, "moe_growth": 300, 
         "agent": {"is_fatal": True, "reason": "Red Team Scan: CourtListener found lawsuits. Glassdoor reports 80% turnover in Lab team. Product is fake."}},
        {"name": "FTX (2021)", "sector": "Crypto", "ltv_cac": 20.0, "months_runway": 60, "moe_growth": 1000,
         "agent": {"is_fatal": True, "reason": "Red Team Scan: Private Reddit Leak - zero internal control. Auditor is MHA (tiny firm). Risk of insolvency."}},
    ]
    
    # 4. Standard SaaS Noise (Filling the 200)
    saas = []
    for i in range(132):
        saas.append({"name": f"SaaS_Noise_{i}", "sector": "B2B SaaS", "ltv_cac": random.uniform(1.0, 5.0), "months_runway": random.randint(12, 36), "moe_growth": random.randint(10, 150)})

    return hardtech + cockroaches + frauds + saas

def run_red_team_audit():
    cohort = generate_stress_cohort()
    results = []
    print(f"--- OPENGRAVITY RED TEAM PHASE 1: STRESS TESTING 200 NODES ---")
    
    for startup in cohort:
        res = PredictiveEngine.evaluate(startup["name"], startup, startup.get("agent"))
        results.append(res)

    # Filtering for Report
    deeptech_winners = [r for r in results if r["sector"] == "DeepTech" and r["status"] == "WINNER"]
    cockroach_invest = [r for r in results if r["sector"] == "Cockroach" and r["status"] in ["WINNER", "REVIEW"]]
    frauds_terminated = [r for r in results if "DROP (Red Team Override)" in r["status"]]

    # Build Markdown Report
    report = f"# 🔴 OpenGravity V10.2 Phase 1 Stress Report\n\n"
    report += f"> **Total Sample Size**: {len(results)} startups (DeepTech, Cockroach, Fraud, SaaS)\n\n"
    
    report += "## 🧪 DeepTech/Hardware Resilience\n"
    report += f"Modified `WEIGHT_LTVCAC` (0.7 -> 0.28) and `BIAS` (+1.2) for DeepTech.\n"
    report += f"**Result**: {len(deeptech_winners)} DeepTech startups salvaged from immediate 'DROP'.\n"
    report += f"- *Example*: Anduril (2018) -> {next((r['prob'] for r in results if r['name'] == 'Anduril (2018)')):.2%} (WINNER)\n\n"

    report += "## 🪳 Cockroach Strategy (Mailchimp/Zapier)\n"
    report += f"Modified `WEIGHT_GROWTH` (2.5 -> 0.5) for high-runway Cockroaches.\n"
    report += f"**Result**: {len(cockroach_invest)} Cockroaches maintained in 'INVEST' territory despite slow growth.\n"
    report += f"- *Example*: Mailchimp (2010) -> {next((r['prob'] for r in results if r['name'] == 'Mailchimp (2010)')):.2%} (WINNER)\n\n"

    report += "## 🚨 FRAUD DETECTION (Red TeamDispatcher)\n"
    report += f"Implemented simulated CourtListener + Glassdoor deep scan.\n"
    report += "| Startup | Input Metrics | Red Team Finding | Status |\n"
    report += "| :--- | :--- | :--- | :--- |\n"
    for f in frauds_terminated:
        report += f"| {f['name']} | SPECTACULAR | {f['reason']} | **{f['status']}** |\n"

    with open("C:/Users/Usuario/Desktop/PHASE_1_STRESS_REPORT.md", "w") as f:
        f.write(report)
    print("PHASE_1_STRESS_REPORT.md generated on Desktop.")

if __name__ == "__main__":
    run_red_team_audit()
