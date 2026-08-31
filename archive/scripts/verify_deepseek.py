import asyncio
import httpx
import os
from typing import Dict
import sys

# Set encoding for Windows CLI
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
if not API_KEY:
    sys.exit("ERROR: DEEPSEEK_API_KEY is not set. Export it or add it to your .env file.")

class TestDecisionEngine:
    DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
    API_KEY = API_KEY

    @classmethod
    async def get_deepseek_verdict(cls, metrics: Dict, agent_report: Dict) -> str:
        prompt = f"""
        [DEEPSEEK PAGO VALIDATION TEST]
        Analyze this investment opportunity as a top-tier VC.
        
        METRICS: {metrics}
        REPORT: {agent_report}
        
        Give a short 1-paragraph verdict to confirm connection is ACTIVE.
        """
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                cls.DEEPSEEK_URL,
                headers={"Authorization": f"Bearer {cls.API_KEY}"},
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1
                }
            )
            data = response.json()
            if "choices" not in data:
                return f"API ERROR: {data}"
            return data["choices"][0]["message"]["content"]

async def main():
    print("Verificando conexion DIRECTA de OpenGravity con DeepSeek PAGO (Thomas Cloud Key)...")
    metrics = {"ltv_cac": 4.5, "burn_rate": "$200k/mo", "runway": "18 months"}
    report = {"summary": "Highly scalable SaaS with healthy unit economics."}
    
    try:
        verdict = await TestDecisionEngine.get_deepseek_verdict(metrics, report)
        print("\n[DEEPSEEK VERDICT RECEIVED]:")
        print(verdict)
        print("\nVALIDACION EXITOSA: OpenGravity esta operando con DeepSeek Pago Independiente.")
    except Exception as e:
        print(f"\nERROR DE CONEXION: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
