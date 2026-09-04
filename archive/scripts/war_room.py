import asyncio
import json
import math
import os
import sys
from typing import List, Dict
from openai import OpenAI
import instructor
from pydantic import BaseModel, Field

# --- DATA MODELS ---

class DebateInteraction(BaseModel):
    agent_name: str
    argument: str
    sentiment: float 

class FinalAllocation(BaseModel):
    startup_name: str
    allocation_pct: float
    rationale: str

class WarRoomReport(BaseModel):
    transcript_summary: str
    final_allocations: List[FinalAllocation]
    system_liquidity_reserve: float

# --- CONFIGURATION (secrets come from environment — never hardcode) ---

CEREBRAS_KEY = os.environ.get("CEREBRAS_API_KEY", "")
if not CEREBRAS_KEY:
    sys.exit("ERROR: CEREBRAS_API_KEY is not set. Export it or add it to your .env file.")
# Using a simpler mode that doesn't wrap in complex schemas
client = instructor.from_openai(
    OpenAI(base_url="https://api.cerebras.ai/v1", api_key=CEREBRAS_KEY),
    mode=instructor.Mode.JSON
)

PORTFOLIO = [
    {"name": "SpaceX", "sector": "DeepTech", "prob": 0.2975, "audit": "NASA Contracts (Moat: 0.9)"},
    {"name": "Zoho", "sector": "Cockroach", "prob": 0.92, "audit": "Zero external debt. 30% YOY growth. Self-funded."},
    {"name": "Rivian", "sector": "DeepTech", "prob": 0.4154, "audit": "Amazon Contract. High manufacturing friction."},
    {"name": "Deel", "sector": "B2B SaaS", "prob": 0.78, "audit": "High growth, high churn risk in recession."},
]

async def run_war_room():
    print("Initializing War Room (Direct Mode)...")
    
    full_transcript_text = ""
    
    for startup in PORTFOLIO:
        print(f"[*] Analyzing {startup['name']}...")
        
        # Simpler prompt to avoid Llama nested JSON errors
        prompt = f"""AUDIT DATA: {startup}
        1. THE BULL (Growth): Argue for MAX allocation.
        2. THE BEAR (Red Team): Argue for ZERO allocation.
        3. THE QUANT (Math): Set a Kelly limit.
        
        Return a cohesive debate transcript in text format."""
        
        # Using a raw call to get text debate to avoid Instructor issues on sub-calls
        raw_client = OpenAI(base_url="https://api.cerebras.ai/v1", api_key=CEREBRAS_KEY)
        response = raw_client.chat.completions.create(
            model="llama3.1-8b",
            messages=[{"role": "user", "content": prompt}]
        )
        debate_text = response.choices[0].message.content
        full_transcript_text += f"\n--- {startup['name']} DEBATE ---\n{debate_text}\n"

    # Final Synthesis (Using Instructor ONLY for the final structured output)
    print("[!] Synthesizing Final Allocation...")
    conclusion = client.chat.completions.create(
        model="llama3.1-8b",
        response_model=WarRoomReport,
        messages=[
            {"role": "system", "content": "You are THE ALLOCATOR. Synthesize the debate. Allocate 100% (including min 20% Cash). SpaceX/Zoho focus."},
            {"role": "user", "content": f"TRANSCRIPT:\n{full_transcript_text}"}
        ]
    )
    
    print("\n=== FINAL ALLOCATION ===")
    for alloc in conclusion.final_allocations:
        print(f"| {alloc.startup_name:10} | {alloc.allocation_pct:5}% | {alloc.rationale[:60]}...")
    print(f"| CASH RESERVE | {conclusion.system_liquidity_reserve:5}% |")
    
    with open("WAR_ROOM_DECISION.json", "w") as f:
        json.dump(conclusion.model_dump(), f, indent=2)

if __name__ == "__main__":
    asyncio.run(run_war_room())
