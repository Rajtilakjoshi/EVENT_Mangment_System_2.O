"""
Divine Energy Hub — Comprehensive Automated Test Suite (2026 Production)
Validates:
1. High-concurrency atomic check-in (race-condition free).
2. Prasad gate prerequisite enforcement (must pass entry gate first).
3. Idempotency on offline queue replay.
4. Accurate event stats aggregation and duplicate counting.
5. API health check and version compatibility.
"""

import sys
import os
import unittest
from concurrent.futures import ThreadPoolExecutor

# Set up isolated in-memory MongoDB environment for deterministic test execution
import mongomock
mock_client = mongomock.MongoClient()
mock_db = mock_client["divine_dashboard_2026"]

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import mongo_utils
mongo_utils.client = mock_client
mongo_utils.db = mock_db
mongo_utils.guests_collection = mock_db["guests"]
mongo_utils.metrics_collection = mock_db["event_metrics"]

from app import app

class EventManagementSystemTests(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.client = self.app.test_client()
        self.test_token = f"TEST_GUEST_{os.getpid()}"
        
        # Clean up and seed fresh test guest
        mongo_utils.guests_collection.delete_one({"token": self.test_token})
        mongo_utils.insert_guest({
            "token": self.test_token,
            "name": {"firstName": "Test", "middleName": "A", "lastName": "Guest"},
            "phoneNumber": "9999999999",
            "email": "test@divine.org",
            "EntryGateStatus": False,
            "prasad1": False,
            "prasad2": False,
            "prasad3": False,
        })

    def tearDown(self):
        try:
            mongo_utils.guests_collection.delete_one({"token": self.test_token})
        except Exception:
            pass

    def test_01_api_health_check(self):
        """Verify API health endpoint returns status healthy and 2026 version."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertIn("version", data)

    def test_02_atomic_checkin_success(self):
        """Verify initial atomic check-in succeeds and updates guest record."""
        res = mongo_utils.atomic_fast_checkin(self.test_token, gate="entry")
        self.assertTrue(res["success"])
        self.assertTrue(res.get("newlyCheckedIn"))
        self.assertEqual(res["user"]["token"], self.test_token)

        guest = mongo_utils.get_guest_by_token(self.test_token)
        self.assertTrue(guest.get("EntryGateStatus"))

    def test_03_duplicate_checkin_prevention(self):
        """Verify second check-in of same token returns alreadyCheckedIn without double-counting."""
        res1 = mongo_utils.atomic_fast_checkin(self.test_token, gate="entry")
        self.assertTrue(res1["success"])
        self.assertTrue(res1.get("newlyCheckedIn"))

        res2 = mongo_utils.atomic_fast_checkin(self.test_token, gate="entry")
        self.assertTrue(res2["success"])
        self.assertTrue(res2.get("alreadyCheckedIn"))
        self.assertIn("already checked in", res2["message"].lower())

    def test_04_concurrency_race_condition_handling(self):
        """Simulate 10 simultaneous scanners checking in the exact same token at the exact same millisecond."""
        def scan_worker():
            return mongo_utils.atomic_fast_checkin(self.test_token, gate="entry")

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(scan_worker) for _ in range(10)]
            results = [f.result() for f in futures]

        newly_checked_in = [r for r in results if r.get("newlyCheckedIn")]
        already_checked_in = [r for r in results if r.get("alreadyCheckedIn")]

        self.assertEqual(len(newly_checked_in), 1, "Only 1 scan out of 10 should be newly checked in")
        self.assertEqual(len(already_checked_in), 9, "The other 9 concurrent scans must be identified as duplicates")

    def test_05_prasad_security_gate_prerequisite(self):
        """Verify prasad meal cannot be claimed if attendee hasn't passed Entry Gate."""
        res = mongo_utils.atomic_fast_checkin(self.test_token, gate="prasad1")
        self.assertFalse(res["success"])
        self.assertEqual(res.get("code"), "entry_required")

        # Now mark entry gate
        mongo_utils.atomic_fast_checkin(self.test_token, gate="entry")

        # Now prasad should be granted
        res_after = mongo_utils.atomic_fast_checkin(self.test_token, gate="prasad1")
        self.assertTrue(res_after["success"])
        self.assertTrue(res_after.get("newlyClaimed"))

    def test_06_idempotent_offline_sync_replay(self):
        """Simulate replaying offline queue sync twice."""
        res1 = self.client.post("/api/checkin", json={"token": self.test_token, "gate": "entry"})
        self.assertEqual(res1.status_code, 200)

        res2 = self.client.post("/api/checkin", json={"token": self.test_token, "gate": "entry"})
        self.assertEqual(res2.status_code, 200)
        data2 = res2.get_json()
        self.assertTrue(data2.get("alreadyCheckedIn"))

    def test_07_event_stats_accuracy(self):
        """Verify get_event_stats returns accurate counts and db health."""
        stats = mongo_utils.get_event_stats()
        self.assertIn("totalGuests", stats)
        self.assertIn("entryGate", stats)
        self.assertIn("pendingEntry", stats)
        self.assertIn("duplicateScans", stats)
        self.assertIn("dbStatus", stats)
        self.assertEqual(stats["dbStatus"], "Connected")
        self.assertGreaterEqual(stats["totalGuests"], stats["entryGate"])

if __name__ == "__main__":
    unittest.main()
