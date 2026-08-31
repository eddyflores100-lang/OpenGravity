import json
import asyncio
import random
from v10_orchestrator import PredictiveEngine, ScoreRequest

console = Console()

# 30 Synthetic Startups covering all edges (Stars, Traps, Zombies, Unicorns)
STARTUPS = [
    {"name": "AeroScale", "ltv_cac": 4.5, "runway": 24, "growth": 15.0},
    {"name": "NeuralNetix", "ltv_cac": 1.2, "runway": 6, "growth": 8.0},
    {"name": "NexusDB", "ltv_cac": 6.8, "runway": 48, "growth": 25.0},
    {"name": "BlitzDelivery", "ltv_cac": 0.8, "runway": 18, "growth": 120.0},
    {"name": "CryptoFlare", "ltv_cac": 2.1, "runway": 3, "growth": -5.0},
    {"name": "OmniHR", "ltv_cac": 3.0, "runway": 12, "growth": 10.0},
    {"name": "Zenith AI", "ltv_cac": 8.5, "runway": 36, "growth": 45.0},
    {"name": "EcoCharge", "ltv_cac": 1.5, "runway": 8, "growth": 5.0},
    {"name": "QuantumLeap", "ltv_cac": 0.4, "runway": 12, "growth": 200.0},
    {"name": "Vanguard Security", "ltv_cac": 5.2, "runway": 20, "growth": 18.0},
    {"name": "HyperLedger", "ltv_cac": 2.8, "runway": 10, "growth": 2.0},
    {"name": "AquaPure", "ltv_cac": 1.1, "runway": 5, "growth": -10.0},
    {"name": "Nebula Cloud", "ltv_cac": 7.0, "runway": 50, "growth": 30.0},
    {"name": "PulseMed", "ltv_cac": 3.5, "runway": 15, "growth": 12.0},
    {"name": "Apex Robotics", "ltv_cac": 4.0, "runway": 8, "growth": 8.0},
    {"name": "SilverLining", "ltv_cac": 1.9, "runway": 24, "growth": 3.0},
    {"name": "Titan Logistics", "ltv_cac": 0.9, "runway": 60, "growth": 50.0},
    {"name": "Horizon EdTech", "ltv_cac": 2.5, "runway": 14, "growth": 15.0},
    {"name": "Lumos Energy", "ltv_cac": 5.5, "runway": 40, "growth": 22.0},
    {"name": "Spectra Vision", "ltv_cac": 3.2, "runway": 9, "growth": 6.0},
    {"name": "Orbit Satellites", "ltv_cac": 6.0, "runway": 28, "growth": 18.0},
    {"name": "Ignite Marketing", "ltv_cac": 1.4, "runway": 7, "growth": 4.0},
    {"name": "Vertex Gaming", "ltv_cac": 0.6, "runway": 16, "growth": 150.0},
    {"name": "Pioneer Pharma", "ltv_cac": 4.8, "runway": 32, "growth": -2.0},
    {"name": "Nova Space", "ltv_cac": 8.0, "runway": 60, "growth": 40.0},
    {"name": "Aurora Biotech", "ltv_cac": 2.2, "runway": 11, "growth": 9.0},
    {"name": "Celestia VR", "ltv_cac": 1.7, "runway": 5, "growth": 11.0},
    {"name": "Solstice Solar", "ltv_cac": 3.8, "runway": 21, "growth": 14.0},
    {"name": "Meridian FinTech", "ltv_cac": 6.5, "runway": 45, "growth": 35.0},
    {"name": "Quasar Computing", "ltv_cac": 1.3, "runway": 4, "growth": 1.0},
]

def run_simulation():
    print("\n🚀 OPENGRAVITY V10: 30-STARTUP COHORT SIMULATION")
    
    header = f"{'Startup':<20} | {'LTV/CAC':<8} | {'Growth':<8} | {'Runway':<8} | {'Uncertaint':<10} | {'Win Prob':<8} | {'Fragil':<8} | {'Verdict'}"
    print("-" * len(header))
    print(header)
    print("-" * len(header))

    results = {"WINNER": 0, "REVIEW": 0, "DROP": 0, "DEEP_AUDIT": 0}

    for s in STARTUPS:
        req = ScoreRequest(
            startup_name=s["name"],
            ltv_cac=s["ltv_cac"],
            months_runway=s["runway"],
            moe_growth=s["growth"]
        )
        
        uncertainty = PredictiveEngine.calculate_uncertainty(req)
        score = PredictiveEngine.evaluate_static(req)
        
        status = score["status"]
        if uncertainty > 0.3:
            status = "DEEP_AUDIT"
        
        results[status] = results.get(status, 0) + 1
        
        ltv = f"{s['ltv_cac']}x"
        gwth = f"{s['growth']}%"
        rnw = f"{s['runway']}m"
        unc = f"{uncertainty:.2f}"
        winp = f"{(score['probability']*100):.1f}%"
        frag = f"{(score['fragility']*100):.1f}%"
        
        print(f"{s['name']:<20} | {ltv:<8} | {gwth:<8} | {rnw:<8} | {unc:<10} | {winp:<8} | {frag:<8} | {status}")

    print("\nAggregated Cohort Distribution:")
    print(f"WINNERS: {results['WINNER']}")
    print(f"DEEP AUDITS: {results['DEEP_AUDIT']} (High Uncertainty)")
    print(f"REVIEWS: {results['REVIEW']}")
    print(f"DROPS: {results['DROP']} (Toxic / Zombies)")

if __name__ == "__main__":
    run_simulation()
