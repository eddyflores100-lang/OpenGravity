import pandas as pd
import httpx
import asyncio
import json
from datetime import datetime

API_URL = "http://localhost:8000/score"

async def run_audit():
    df = pd.read_csv("cohort_v10_3.csv")
    results = []
    
    print(f"RUNNING: Starting Sovereign Audit of {len(df)} startups...")
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        for index, row in df.iterrows():
            payload = {
                "startup_name": row['startup_name'],
                "ltv_cac": float(row['ltv_cac']),
                "months_runway": float(row['months_runway']),
                "moe_growth": float(row['moe_growth']),
                "sector": row['sector'],
                "zirp_index": float(row['zirp_index'])
            }
            
            print(f"[{index+1}/{len(df)}] Auditing {payload['startup_name']}...")
            try:
                response = await client.post(API_URL, json=payload)
                if response.status_code == 200:
                    results.append(response.json())
                else:
                    print(f"ERROR {response.status_code} for {payload['startup_name']}")
            except Exception as e:
                print(f"CONNECTION FAILED for {payload['startup_name']}: {e}")
                
    # Generate Master Report
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    report_file = f"SOVEREIGN_AUDIT_REPORT_{timestamp}.md"
    
    with open(report_file, "w", encoding="utf-8") as f:
        f.write(f"# 🌌 OpenGravity V10.3 Sovereign Audit Master Report\n")
        f.write(f"Generated: {datetime.now().isoformat()}\n\n")
        
        f.write("## 🏛️ Executive Summary\n")
        winners = [r for r in results if r['result']['status'] == "WINNER"]
        drops = [r for r in results if "DROP" in r['result']['status']]
        f.write(f"- Total Startups Audited: {len(results)}\n")
        f.write(f"- Winners Identified: {len(winners)}\n")
        f.write(f"- Drops/Fatal Failures: {len(drops)}\n")
        f.write(f"- Review Required: {len(results) - len(winners) - len(drops)}\n\n")
        
        f.write("## 📊 Detailed V verdicts\n")
        f.write("| Startup | Sector | Prob | Status | Prior Adj | Fatal? |\n")
        f.write("|---------|--------|------|--------|-----------|--------|\n")
        for r in results:
            startup = r['result'].get('startup', 'N/A') # The API returns 'result' key which might have nested data
            # Wait, my API return structure is {"result": {...}, "agent_report": {...}, "thesis": "..."}
            name = r['agent_report'].get('startup_name', 'Unknown') if r['agent_report'] else "Static Only"
            prob = r['result'].get('probability', 0)
            status = r['result'].get('status', 'N/A')
            adj = r['agent_report'].get('recommended_prior_adj', 0.0) if r['agent_report'] else 0.0
            fatal = "YES" if (r['agent_report'] and r['agent_report'].get('is_fatal')) else "NO"
            f.write(f"| {name} | {status} | {prob} | {status} | {adj} | {fatal} |\n")
            
        f.write("\n## 🧠 Qualitative Theses\n")
        for r in results:
            name = r['agent_report'].get('startup_name', 'Unknown') if r['agent_report'] else "Static Result"
            f.write(f"### {name}\n")
            f.write(f"**Verdict:** {r['result']['status']} (Prob: {r['result']['probability']})\n\n")
            f.write(f"**Agent Analysis:**\n{r['agent_report'].get('analysis', 'N/A') if r['agent_report'] else 'N/A'}\n\n")
            f.write(f"**Institutional Thesis:**\n{r['thesis']}\n\n")
            f.write("---\n\n")

    print(f"✅ Audit Complete. Report saved to {report_file}")

if __name__ == "__main__":
    asyncio.run(run_audit())
