# Simple smoke test for backend
import requests

BASE = "http://127.0.0.1:8000"

def test_health():
    r = requests.get(f"{BASE}/health")
    print('status_code:', r.status_code)
    print('body:', r.json())

if __name__ == '__main__':
    test_health()