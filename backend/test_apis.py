"""Smoke-test core 2026 API routes against a running local server."""
import os
import sys

import requests

BASE = os.environ.get("API_BASE", f"http://127.0.0.1:{os.environ.get('PORT', '5000')}")


def main():
    checks = [
        ("GET", f"{BASE}/api/health", None),
        ("GET", f"{BASE}/api/stats", None),
        ("GET", f"{BASE}/api/guests", None),
    ]
    ok = True
    for method, url, body in checks:
        try:
            r = requests.request(method, url, json=body, timeout=8)
            print(f"{method} {url} -> {r.status_code} {r.text[:120]}")
            if r.status_code >= 400:
                ok = False
        except Exception as e:
            print("FAIL", url, e)
            ok = False
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
