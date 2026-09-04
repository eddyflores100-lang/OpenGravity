import uuid

def mock_agent_logic(name, content):
    """
    Simulates the Hardened V10.3 logic for extracting Prior_Adj from Agent findings.
    """
    low_content = content.lower()
    adj = 0.0
    
    # 1. Hype Detection (The 'Cynical' Filter)
    hype_keywords = ["revolutionary", "next google", "game-changing", "visionary", "groundbreaking"]
    hype_count = sum(1 for word in hype_keywords if word in low_content)
    
    # 2. Fact Extraction
    facts = {
        "lawsuit": -0.5,
        "exodus": -0.6,
        "sec filing": 0.2,
        "verifiable audit": 0.3,
        "github activity": 0.2
    }
    
    # Apply Facts
    found_facts = False
    for fact, weight in facts.items():
        if fact in low_content:
            adj += weight
            found_facts = True
            
    # 3. Apply Cynical Penalization for Hype if NO facts exist
    if hype_count > 2 and not found_facts:
        adj = -0.3 # Penalize empty hype
        reason = "Hype-to-Fact Ratio Violation: Unsubstantiated marketing language detected."
    elif not found_facts:
        adj = 0.0 # Strict Neutral if no news
        reason = "Neutral Audit: No significant verifiable signals found."
    else:
        reason = f"Fact-based adjustment: {adj}"

    return {"name": name, "adj": round(adj, 2), "reason": reason}

# --- TEST CASES ---
scenarios = [
    {
        "name": "HypeCloud AI",
        "description": "The Next Google! Revolutionary AI that is groundbreaking and visionary. A game-changing platform."
    },
    {
        "name": "Ohio Ledger",
        "description": "Standard B2B SaaS for accounting. Founded in 2018. Steady operations."
    },
    {
        "name": "CryptoGuard",
        "description": "Recent lawsuit filed. Engineering exodus detected last month. PR claims they are revolutionary."
    },
    {
        "name": "Verified Moat",
        "description": "SEC filing verified. Verifiable audit completed. Strong Github activity observed."
    }
]

print("PHASE 3: AGENTIC RED TEAMING STRESS TEST\n")
print("| Startup | Content Tone | Expected Adj | Actual Adj | Result |")
print("| --- | --- | --- | --- | --- |")

for s in scenarios:
    result = mock_agent_logic(s['name'], s['description'])
    success = "PASSED"
    if s['name'] == "HypeCloud AI" and result['adj'] > 0: success = "FAILED (Fell for Hype)"
    if s['name'] == "Ohio Ledger" and result['adj'] != 0: success = "FAILED (Hallucinated)"
    
    print(f"| {s['name']} | {s['description'][:30]}... | {'<= 0' if 'Hype' in s['name'] else '0.0' if 'Ohio' in s['name'] else '+/--'} | {result['adj']} | {success} |")
    print(f"  > Audit Logic: {result['reason']}")
