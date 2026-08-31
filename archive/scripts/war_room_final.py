import asyncio
import json
import os
import sys
from openai import OpenAI
import instructor
from pydantic import BaseModel, Field
from typing import List

# --- SCHEMA ---
class FinalAllocation(BaseModel):
    name: str
    allocation: float
    reason: str

class FinalReport(BaseModel):
    debate_transcript: str
    allocations: List[FinalAllocation]
    reserve: float

# --- CONFIG (secrets come from environment — never hardcode) ---
CEREBRAS_KEY = os.environ.get("CEREBRAS_API_KEY", "")
if not CEREBRAS_KEY:
    sys.exit("ERROR: CEREBRAS_API_KEY is not set. Export it or add it to your .env file.")
raw_client = OpenAI(base_url="https://api.cerebras.ai/v1", api_key=CEREBRAS_KEY)
inst_client = instructor.from_openai(raw_client, mode=instructor.Mode.JSON)

PORTFOLIO = [
    {"name": "SpaceX", "sector": "DeepTech", "prob": 0.2975, "audit": "NASA Contracts (Moat: 0.9)"},
    {"name": "Zoho", "sector": "Cockroach", "prob": 0.92, "audit": "Zero debt. Self-funded. Positive Cashflow."},
    {"name": "Rivian", "sector": "DeepTech", "prob": 0.4150, "audit": "Amazon Contract. Production hell risk."},
    {"name": "Deel", "sector": "B2B SaaS", "prob": 0.7800, "audit": "Global payroll dominate. Low Moat."},
]

async def run():
    print("WAR ROOM V10.3: ADVERSARIAL MODE")
    
    # 1. GENERATE DEBATE
    prompt = f"""PORTFOLIO: {json.dumps(PORTFOLIO)}
    SIMULATE A VIOLENT CONFLICT:
    - THE BULL: Push for 40% SpaceX. Ignore risk.
    - THE BEAR: Push for 0% SpaceX. Focus on NASA dependence.
    - THE QUANT: Fixate on interest rates (5%).
    - THE ALLOCATOR: Make the final decision.
    
    GIVE ME THE FULL TRANSCRIPT OF THE FIGHT."""
    
    resp = raw_client.chat.completions.create(model="llama3.1-8b", messages=[{"role": "user", "content": prompt}])
    transcript = resp.choices[0].message.content
    
    # 2. EXTRACT DATA
    report = inst_client.chat.completions.create(
        model="llama3.1-8b",
        response_model=FinalReport,
        messages=[
            {"role": "system", "content": "You are THE ALLOCATOR. Extract the debate and final % allocations. Ensure sum (allocations + reserve) = 100. Min reserve = 25%."},
            {"role": "user", "content": f"DEBATE:\n{transcript}"}
        ]
    )
    
    print(transcript)
    with open("FINAL_WAR_ROOM.json", "w") as f:
        json.dump(report.model_dump(), f, indent=2)

if __name__ == "__main__":
    asyncio.run(run())
