import httpx
import asyncio
import json

API_URL = "http://localhost:8000"

CASES = [
    {"startup_name": "SpaceX", "ltv_cac": 0.5, "months_runway": 12, "moe_growth": 300, "sector": "DeepTech", "zirp_index": 5.0},
    {"startup_name": "Nikola Motor", "ltv_cac": 0.05, "months_runway": 8, "moe_growth": 5, "sector": "DeepTech", "zirp_index": 1.0},
    {"startup_name": "Deel", "ltv_cac": 5.0, "months_runway": 24, "moe_growth": 120, "sector": "B2B SaaS", "zirp_index": 3.0},
]

async def main():
    print("=" * 80)
    print("OPENGRAVITY V10.4 — METROLOGICAL VERIFICATION")
    print("=" * 80)

    async with httpx.AsyncClient(timeout=300.0) as client:
        # --- TEST 1: Score with Monte Carlo ---
        for case in CASES:
            name = case["startup_name"]
            print(f"\n{'-' * 60}")
            print(f"  {name}")
            print(f"{'-' * 60}")
            res = await client.post(f"{API_URL}/score", json=case)
            data = res.json()
            r = data["result"]
            mc = r.get("monte_carlo", {})

            print(f"  [L1 BAYESIAN]  prob_raw={r['probability_raw']}  logit={r['logit_raw']}  math_status={r['math_status']}")
            print(f"  [L1B MONTE C]  mean={mc.get('prob_mean','N/A')} ± {mc.get('prob_std','N/A')}  CI=[{mc.get('ci_95_low','N/A')}, {mc.get('ci_95_high','N/A')}]  {mc.get('uncertainty_flag','N/A')}")
            print(f"  [L2 AGENT]     adj={r['agent_adj']}  is_fatal={r['is_fatal']}")
            print(f"  [L3 POLICY]    prob_adj={r['probability_adjusted']}  verdict={r['verdict']}  source={r['verdict_source']}")

            with open(f"v104_{name.split()[0]}.json", "w") as f:
                json.dump(data, f, indent=2)

        # --- TEST 2: Brier Score Calibration ---
        print(f"\n{'=' * 80}")
        print("BRIER SCORE CALIBRATION REPORT")
        print(f"{'=' * 80}")

        brier_res = await client.get(f"{API_URL}/calibration")
        brier = brier_res.json()

        print(f"\n  BRIER SCORE:   {brier['brier_score']}")
        print(f"  GRADE:         {brier['grade']}")
        print(f"  N SAMPLES:     {brier['n_samples']}")
        print(f"  MEAN PREDICTED: {brier['mean_predicted']}")
        print(f"  MEAN ACTUAL:    {brier['mean_actual']}")

        print(f"\n  CALIBRATION CURVE:")
        print(f"  {'Bucket':>8} | {'Avg Pred':>8} | {'Avg Actual':>10} | {'Count':>5} | {'Gap':>6}")
        print(f"  {'-'*8}-+-{'-'*8}-+-{'-'*10}-+-{'-'*5}-+-{'-'*6}")
        for row in brier['calibration_curve']:
            print(f"  {row['bucket']:>8.1f} | {row['avg_predicted']:>8.4f} | {row['avg_actual']:>10.4f} | {row['count']:>5} | {row['gap']:>6.4f}")

        with open("brier_score_report.json", "w") as f:
            json.dump(brier, f, indent=2)

    print(f"\n{'=' * 80}")
    print("ALL V10.4 TESTS COMPLETE")
    print(f"{'=' * 80}")

if __name__ == "__main__":
    asyncio.run(main())
