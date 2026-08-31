import asyncio
import json
import re
import random
import os
from pathlib import Path
from datetime import datetime
from playwright.async_api import async_playwright
import dotenv

# Cargar configuración de OpenGravity
dotenv.load_dotenv()

# --- CONFIG ---
OUTPUT_DIR = Path("leads_output")
OUTPUT_DIR.mkdir(exist_ok=True)
LEADS_FILE = OUTPUT_DIR / "leads_tax_software.json"

# Proxies extraídos de .env
PROXIES = [
    os.getenv("LAUNCH_URL_11435"),
    os.getenv("LAUNCH_URL_11436"),
    os.getenv("LAUNCH_URL_11437"),
    os.getenv("LAUNCH_URL_11438"),
    os.getenv("LAUNCH_URL_11439")
]
PROXIES = [p for p in PROXIES if p] # Filtrar nulos

# Lista de User-Agents para rotar
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1"
]

# DORKS ESPECIALIZADOS
DORKS = [
    # Nicho: Impuestos LLC
    'site:reddit.com "LLC" "tax" "IRS" "problem" "@gmail.com"',
    'site:facebook.com "contabilidad LLC" "problema impuestos" "@gmail.com"',
    'site:quora.com "LLC tax penalty" "@gmail.com"',
    'site:instagram.com "LLC taxes" "help" "@gmail.com"',
    '"tax relief for LLC" "@gmail.com"',
    '"problemas con el IRS" LLC "@gmail.com"',
    
    # Nicho: Necesidad de Software
    'site:clutch.co "software development" "@gmail.com"',
    'site:linkedin.com/posts "busco desarrollador" "@gmail.com"',
    'site:linkedin.com/posts "need a developer" "@gmail.com"',
    'site:twitter.com "presupuesto para mi app" "@gmail.com"',
    '"desarrollo de software a medida" "@gmail.com"',
    '"necesito programador" "@gmail.com"'
]

async def scrape_with_stealth():
    async with async_playwright() as p:
        print("\n🛡️  INICIANDO LEAD SNIPER - MODO STEALTH ACTIVADO 🛡️")
        print("="*60)
        
        # Cargar leads existentes
        leads = []
        if LEADS_FILE.exists():
            try:
                with open(LEADS_FILE, "r", encoding="utf-8") as f:
                    leads = json.load(f)
            except:
                leads = []
        
        seen = {l['email'] for l in leads if 'email' in l}
        print(f"📦 Leads actuales en base de datos: {len(leads)}")

        # Mezclar dorks para no ser predecibles
        random.shuffle(DORKS)

        for dork in DORKS:
            # Rotar Proxy
            proxy_url = random.choice(PROXIES) if PROXIES else None
            proxy_config = None
            if proxy_url:
                # El formato de proxy de Playwright es diferente al de .env
                # user:pass@host:port -> {server, username, password}
                match = re.match(r"http://(.*?):(.*?)@(.*?):(.*?)$", proxy_url)
                if match:
                    user, pw, host, port = match.groups()
                    proxy_config = {
                        "server": f"http://{host}:{port}",
                        "username": user,
                        "password": pw
                    }

            # Rotar User Agent
            ua = random.choice(USER_AGENTS)
            
            print(f"\n🔍 Buscando: {dork}")
            if proxy_config:
                print(f"🌐 Usando Proxy: {proxy_config['server']}")

            # Lanzar navegador con configuración rotada
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=ua,
                viewport={'width': random.randint(1024, 1920), 'height': random.randint(720, 1080)},
                proxy=proxy_config if proxy_config else None
            )
            page = await context.new_page()

            try:
                # Alternar entre Bing y DuckDuckGo (Google es agresivo con los bloqueos)
                search_engine = random.choice(["bing", "duckduckgo"])
                if search_engine == "bing":
                    url = f"https://www.bing.com/search?q={dork}&count=50"
                else:
                    url = f"https://duckduckgo.com/?q={dork}"

                await page.goto(url, wait_until="networkidle", timeout=30000)
                
                # Simular scroll humano
                for _ in range(random.randint(2, 4)):
                    await page.evaluate("window.scrollBy(0, window.innerHeight)")
                    await asyncio.sleep(random.uniform(1, 3))

                content = await page.content()
                
                # Regex mejorada para emails
                found_emails = re.findall(r"[a-zA-Z0-9_\-\.\+]+@[a-zA-Z0-9_\-\.]+\.[a-zA-Z]{2,6}", content)
                
                new_count = 0
                for email in found_emails:
                    email = email.lower().strip('.')
                    # Filtros de seguridad
                    if email not in seen and not any(x in email for x in ['example.com', 'sentry.io', 'w3.org', 'test.com', 'microsoft.com', 'bing.com', 'google.com', 'duckduckgo.com']):
                        seen.add(email)
                        new_lead = {
                            "email": email,
                            "topic": "Tax/LLC" if "tax" in dork.lower() or "llc" in dork.lower() else "Software",
                            "dork": dork,
                            "source": search_engine,
                            "timestamp": datetime.now().isoformat()
                        }
                        leads.append(new_lead)
                        print(f"✨ [LEAD] {email} | {new_lead['topic']}")
                        
                        # [V10] INJECT TO OPENGRAVITY API
                        try:
                            import aiohttp
                            async with aiohttp.ClientSession() as session:
                                api_url = os.getenv("OPENGRAVITY_API_URL", "http://localhost:3000/api/ingest")
                                async with session.post(api_url, json={"type": "lead", "data": new_lead}) as resp:
                                    if resp.status == 200:
                                        print(f"📡 [V10] Lead inyectado en OpenGravity API")
                                    else:
                                        print(f"⚠️ Error API: {resp.status}")
                        except ImportError:
                            print("💡 Sugerencia: pip install aiohttp para inyección en tiempo real.")
                        except Exception as e:
                            print(f"⚠️ Error Inyectando Lead: {str(e)}")
                            
                        new_count += 1

                if new_count > 0:
                    with open(LEADS_FILE, "w", encoding="utf-8") as f:
                        json.dump(leads, f, indent=2, ensure_ascii=False)
                    print(f"💾 Guardados {new_count} nuevos leads. Total: {len(leads)}")

            except Exception as e:
                print(f"❌ Error en búsqueda: {str(e)[:100]}")
            
            finally:
                await browser.close()
                # Espera larga entre dorks para enfriar la IP/Proxy
                wait_time = random.uniform(10, 25)
                print(f"☕ Esperando {wait_time:.2f}s para enfriar...")
                await asyncio.sleep(wait_time)

        print(f"\n✅ Misión completada. Total leads: {len(leads)}")
        print(f"📂 Archivo: {LEADS_FILE}")

if __name__ == "__main__":
    asyncio.run(scrape_with_stealth())
