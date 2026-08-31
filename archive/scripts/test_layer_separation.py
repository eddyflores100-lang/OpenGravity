import httpx
import asyncio
import json

API_URL = "http://localhost:8000/score"

CASES = [
    {"startup_name": "SpaceX", "ltv_cac": 0.5, "months_runway": 12, "moe_growth": 300, "sector": "DeepTech", "zirp_index": 5.0},
    {"startup_name": "Nikola Motor", "ltv_cac": 0.05, "months_runway": 8, "moe_growth": 5, "sector": "DeepTech", "zirp_index": 1.0},
    {"startup_name": "Deel", "ltv_cac": 5.0, "months_runway": 24, "moe_growth": 120, "sector": "B2B SaaS", "zirp_index": 3.0},
]

async def main():
    print("=== LAYER SEPARATION VERIFICATION TEST ===\n")
    async with httpx.AsyncClient(timeout=300.0) as client:
        for case in CASES:
            name = case["startup_name"]
            print(f"--- {name} ---")
            res = await client.post(API_URL, json=case)
            data = res.json()
            r = data["result"]
            
            # THE KEY VERIFICATION: probability_raw must be independent of agent_adj
            print(f"  [LAYER 1 - BAYESIAN]  prob_raw={r['probability_raw']}  logit_raw={r['logit_raw']}  math_status={r['math_status']}")
            print(f"  [LAYER 2 - AGENT]     agent_adj={r['agent_adj']}  is_fatal={r['is_fatal']}")
            print(f"  [LAYER 3 - POLICY]    prob_adj={r['probability_adjusted']}  verdict={r['verdict']}  source={r['verdict_source']}")
            print()
            
            with open(f"layered_{name.split()[0]}.json", "w") as f:
                json.dump(data, f, indent=2)
    
    print("=== ALL TESTS COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(main())
