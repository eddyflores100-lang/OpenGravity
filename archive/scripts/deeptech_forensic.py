import httpx
import asyncio
import json

API_URL = "http://localhost:8000/score"

async def run_forensic():
    cases = [
        {
            "startup_name": "SpaceX",
            "ltv_cac": 0.5, # High capex, low direct customer LTV early on
            "months_runway": 12,
            "moe_growth": 300,
            "sector": "DeepTech",
            "zirp_index": 5.0 # High interest rate environment
        },
        {
            "startup_name": "Rivian",
            "ltv_cac": 0.8,
            "months_runway": 18,
            "moe_growth": 150,
            "sector": "DeepTech",
            "zirp_index": 5.0
        },
        {
            "startup_name": "Nikola Motor",
            "ltv_cac": 0.05,
            "months_runway": 8,
            "moe_growth": 5,
            "sector": "DeepTech",
            "zirp_index": 1.0
        }
    ]
    
    print("Starting DeepTech Forensic Slicing...")
    async with httpx.AsyncClient(timeout=300.0) as client:
        for case in cases:
            print(f"--- Fulfilling Audit for {case['startup_name']} ---")
            res = await client.post(API_URL, json=case)
            if res.status_code == 200:
                data = res.json()
                print(json.dumps(data, indent=2))
                with open(f"forensic_{case['startup_name'].split()[0]}.json", "w") as f:
                    json.dump(data, f, indent=2)
            else:
                print(f"Error: {res.text}")

if __name__ == "__main__":
    asyncio.run(run_forensic())
