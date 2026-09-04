import json
import math
from datetime import datetime

# ==============================================================================
# OPENGRAVITY V10: STRESS TESTING COHORT (RED TEAMING PHASE 1)
# ==============================================================================

STRESS_COHORT = {
    # DEEPTECH / HARDWARE (High Capex, Negative initial unit economics)
    "SpaceX (2008)": {
        "sector": "DeepTech",
        "ltv_cac": 0.2, 
        "runway": 3, 
        "growth": 5, 
        "agent_adj": 0.4, 
        "agent_fatal": None,
        "notes": "Post-3rd failure. Critical liquidity crisis. High moats but metrics look terminal."
    },
    "Anduril (Early)": {
        "sector": "DeepTech",
        "ltv_cac": 1.2,
        "runway": 12,
        "growth": 20,
        "agent_adj": 0.3,
        "agent_fatal": None,
        "notes": "Large government contracts pending, but heavy R&D burn."
    },
    "Rivian (Pre-IPO)": {
        "sector": "DeepTech",
        "ltv_cac": 0.5,
        "runway": 18,
        "growth": 300,
        "agent_adj": -0.2,
        "agent_fatal": None,
        "notes": "Massive scale but unit economics deeply negative per truck."
    },

    # COCKROACHES (Ultra-profitable, Slow growth)
    "Mailchimp (2010)": {
        "sector": "Cockroach",
        "ltv_cac": 8.0,
        "runway": 100,
        "growth": 15,
        "agent_adj": 0.1,
        "agent_fatal": None,
        "notes": "Bootstrapped, highly profitable, slow but steady growth."
    },
    "Basecamp (Early)": {
        "sector": "Cockroach",
        "ltv_cac": 10.0,
        "runway": 200,
        "growth": 10,
        "agent_adj": 0.2,
        "agent_fatal": None,
        "notes": "Zero churn, zero debt, intentional slow growth."
    },

    # THE FRAUDS (Fake Spectactular Metrics + Toxic Culture)
    "Theranos (2014)": {
        "sector": "HealthTech",
        "ltv_cac": 12.0, # FAKE
        "runway": 48,
        "growth": 400,
        "agent_adj": 0.5, # BASED ON POSITIVE PR
        "agent_fatal": None, # SHOULD WE DETECT THIS?
        "notes": "Awaiting Red Team findings on lab results and employee turnover."
    },
    "FTX (2021)": {
        "sector": "Crypto",
        "ltv_cac": 15.0, # FAKE
        "runway": 60,
        "growth": 1000,
        "agent_adj": 0.4,
        "agent_fatal": None,
        "notes": "Hyper-growth, massive regulatory capture, celebrity endorsement."
    }
}

class PredictiveEngineV10:
    """Current V10 Logic (to be stressed)"""
    BASE_BIAS = -1.6
    WEIGHT_LTVCAC = 0.70
    WEIGHT_GROWTH = 1.6
    WEIGHT_FRAGILITY = -1.2
    
    @classmethod
    def evaluate(cls, name, data):
        ltv_cac = data["ltv_cac"]
        growth = data["growth"]
        runway = data["runway"]
        agent_adj = data["agent_adj"]
        agent_fatal = data["agent_fatal"]
        
        bias = cls.BASE_BIAS + agent_adj
        
        growth_signal = math.log1p(max(0, growth) / 100.0) * cls.WEIGHT_GROWTH
        frag_signal = (6.0 / max(0.1, runway)) * cls.WEIGHT_FRAGILITY
        
        logit = bias + (ltv_cac * cls.WEIGHT_LTVCAC) + growth_signal + frag_signal
        
        # Hardcoded deal killers in current version
        if runway <= 6: logit -= 5.0
        if ltv_cac < 1.0: logit -= 9.0
        
        prob = 1.0 / (1.0 + math.exp(-logit))
        
        status = "DROP"
        if prob > 0.85: status = "WINNER"
        elif prob > 0.50: status = "INVEST"
        elif prob >= 0.15: status = "REVIEW"

        if agent_fatal:
            prob = 0.01
            status = "DROP (Agent Override)"
            
        return {
            "name": name,
            "sector": data.get("sector", "SaaS"),
            "prob": prob,
            "status": status,
            "notes": data["notes"]
        }

def run_stress_test():
    print(f"--- RUNNING STRESS TEST PHASE 1 ---")
    results = []
    for name, metrics in STRESS_COHORT.items():
        res = PredictiveEngineV10.evaluate(name, metrics)
        results.append(res)
        
    print("| Startup | Sector | P(Hit) | Status | Notes |")
    print("| :--- | :--- | :--- | :--- | :--- |")
    for r in results:
        print(f"| {r['name']} | {r['sector']} | {r['prob']*100:.1f}% | {r['status']} | {r['notes']} |")

if __name__ == "__main__":
    run_stress_test()
