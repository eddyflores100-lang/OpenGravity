import httpx
import json

def test():
    url = "http://localhost:8000/score"
    data = {
        "startup_name": "ZephyrAI",
        "ltv_cac": 5.2,
        "months_runway": 40,
        "moe_growth": 5.0
    }
    try:
        response = httpx.post(url, json=data, timeout=30.0)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
