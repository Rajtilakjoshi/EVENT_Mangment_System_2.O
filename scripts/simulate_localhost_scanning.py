"""
Divine Energy Hub — Localhost Scanning Workflow Simulator (2026)
Executes end-to-end operational scanning tests:
1. Valid First-Time Entry Scan
2. Duplicate Entry Scan Prevention
3. Prasad Gate Meal Claim
4. Duplicate Meal Claim Prevention
5. Security Gate Bypass Blocking (No Entry -> No Prasad)
6. Invalid QR Token Handling
7. 20-Scan Rapid Burst Latency Benchmark
"""

import sys
import os
import time
import statistics

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

import mongomock
mock_client = mongomock.MongoClient()
mock_db = mock_client["divine_dashboard_2026"]

import mongo_utils
mongo_utils.client = mock_client
mongo_utils.db = mock_db
mongo_utils.guests_collection = mock_db["guests"]
mongo_utils.metrics_collection = mock_db["event_metrics"]

from app import app

def run_simulation():
    client = app.test_client()
    
    print("=" * 70)
    print("  DIVINE ENERGY HUB 2026 — LOCALHOST SCANNING SIMULATOR")
    print("=" * 70)

    # Seed test guests
    token_valid = "SCAN_TEST_001"
    token_unverified = "SCAN_TEST_002"
    
    mongo_utils.insert_guest({
        "token": token_valid,
        "name": {"firstName": "Aarav", "middleName": "K", "lastName": "Sharma"},
        "phoneNumber": "9876543210",
        "EntryGateStatus": False,
        "prasad1": False,
        "prasad2": False,
        "prasad3": False,
    })
    
    mongo_utils.insert_guest({
        "token": token_unverified,
        "name": {"firstName": "Priya", "middleName": "M", "lastName": "Patel"},
        "phoneNumber": "9123456780",
        "EntryGateStatus": False,
        "prasad1": False,
        "prasad2": False,
        "prasad3": False,
    })

    # Test 1: Valid Entry Scan
    print("\n[Scenario 1] Scanning new attendee at Main Entry Gate...")
    t0 = time.time()
    res1 = client.post("/api/checkin", json={"token": token_valid, "gate": "entry"})
    lat1 = round((time.time() - t0) * 1000, 2)
    d1 = res1.get_json()
    assert res1.status_code == 200 and d1.get("newlyCheckedIn") is True
    print(f"  ✅ PASS: Entry Verified! Latency: {lat1} ms")
    print(f"     Attendee: {d1['user']['name']['firstName']} {d1['user']['name']['lastName']} | Token: {token_valid}")

    # Test 2: Immediate Duplicate Entry Scan
    print("\n[Scenario 2] Scanning the SAME attendee again at Main Entry Gate...")
    t0 = time.time()
    res2 = client.post("/api/checkin", json={"token": token_valid, "gate": "entry"})
    lat2 = round((time.time() - t0) * 1000, 2)
    d2 = res2.get_json()
    assert res2.status_code == 200 and d2.get("alreadyCheckedIn") is True
    print(f"  ✅ PASS: Duplicate Intercepted! Latency: {lat2} ms")
    print(f"     Alert: {d2['message']} (Original Entry: {d2.get('firstCheckedInAt', 'recorded')})")

    # Test 3: Prasad 1 Meal Claim
    print("\n[Scenario 3] Scanning attendee at Prasad Gate 1 (Meal Counter)...")
    t0 = time.time()
    res3 = client.post("/api/checkin", json={"token": token_valid, "gate": "prasad1"})
    lat3 = round((time.time() - t0) * 1000, 2)
    d3 = res3.get_json()
    assert res3.status_code == 200 and d3.get("newlyClaimed") is True
    print(f"  ✅ PASS: Meal Granted! Latency: {lat3} ms")
    print(f"     Status: {d3['message']}")

    # Test 4: Duplicate Prasad Claim
    print("\n[Scenario 4] Scanning the SAME attendee again at Prasad Gate 1...")
    t0 = time.time()
    res4 = client.post("/api/checkin", json={"token": token_valid, "gate": "prasad1"})
    lat4 = round((time.time() - t0) * 1000, 2)
    d4 = res4.get_json()
    assert res4.status_code == 200 and d4.get("alreadyClaimed") is True
    print(f"  ✅ PASS: Duplicate Meal Prevented! Latency: {lat4} ms")
    print(f"     Alert: {d4['message']}")

    # Test 5: Security Gate Bypass Check
    print("\n[Scenario 5] Scanning attendee at Prasad Gate who BYPASSED Entry Gate...")
    t0 = time.time()
    res5 = client.post("/api/checkin", json={"token": token_unverified, "gate": "prasad1"})
    lat5 = round((time.time() - t0) * 1000, 2)
    d5 = res5.get_json()
    assert res5.status_code == 403 and d5.get("code") == "entry_required"
    print(f"  ✅ PASS: Security Violation Intercepted (HTTP 403)! Latency: {lat5} ms")
    print(f"     Security Warning: {d5['message']}")

    # Test 6: Invalid QR Code
    print("\n[Scenario 6] Scanning invalid / unregistered QR badge...")
    t0 = time.time()
    res6 = client.post("/api/checkin", json={"token": "UNKNOWN_RANDOM_QR_999", "gate": "entry"})
    lat6 = round((time.time() - t0) * 1000, 2)
    d6 = res6.get_json()
    assert res6.status_code == 404 and d6.get("code") == "not_found"
    print(f"  ✅ PASS: Unregistered Badge Flagged (HTTP 404)! Latency: {lat6} ms")
    print(f"     Response: {d6['message']}")

    # Test 7: 20-Scan Burst Benchmark
    print("\n[Scenario 7] Executing rapid burst of 20 sequential scans...")
    # Seed 20 test tokens
    for i in range(20):
        mongo_utils.insert_guest({
            "token": f"BURST_{i}",
            "name": {"firstName": f"Guest{i}", "lastName": "Burst"},
            "phoneNumber": f"90000000{i:02d}",
            "EntryGateStatus": False,
        })
    
    burst_latencies = []
    for i in range(20):
        t0 = time.time()
        r = client.post("/api/checkin", json={"token": f"BURST_{i}", "gate": "entry"})
        burst_latencies.append((time.time() - t0) * 1000)
        assert r.status_code == 200
    
    mean_lat = round(statistics.mean(burst_latencies), 2)
    min_lat = round(min(burst_latencies), 2)
    max_lat = round(max(burst_latencies), 2)
    p95_lat = round(statistics.quantiles(burst_latencies, n=20)[18], 2)
    
    print(f"  ✅ PASS: 20/20 Scans Successful!")
    print(f"     Average Latency: {mean_lat} ms")
    print(f"     Min Latency:     {min_lat} ms")
    print(f"     Max Latency:     {max_lat} ms")
    print(f"     P95 Latency:     {p95_lat} ms")
    
    print("\n" + "=" * 70)
    print("  SIMULATION COMPLETE: ALL 7 SCANNING WORKFLOW SCENARIOS PASSED!")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    run_simulation()
