import pandas as pd
import httpx
import asyncio

API_URL = "http://localhost:8000/score"

async def test():
    test_cases = [
        {"startup_name": "SpaceX", "ltv_cac": 0.5, "months_runway": 12, "moe_growth": 300, "sector": "DeepTech", "zirp_index": 5.0},
        {"startup_name": "Theranos", "ltv_cac": 0.01, "months_runway": 6, "moe_growth": 10, "sector": "HealthTech", "zirp_index": 1.0}
    ]
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        for payload in test_cases:
            print(f"Testing {payload['startup_name']}...")
            res = await client.post(API_URL, json=payload)
            print(f"Result: {res.status_code}")
            if res.status_code == 200:
                print(res.json())
            else:
                print(res.text)

if __name__ == "__main__":
    asyncio.run(test())
