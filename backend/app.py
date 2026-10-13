"""
Divine Energy Hub — Flask API (2026)
Live source of truth: MongoDB. Google Sheets = write-behind mirror only.
"""
import os
import sys
import io
import functools
from datetime import datetime, timezone

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)

allowed_origins = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,https://final-event-mangement-app.vercel.app",
    ).split(",")
    if o.strip()
]
CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)

# --- API Key Authentication ---
API_KEY = os.environ.get("API_KEY", "")


def require_api_key(f):
    """Decorator to require a valid API key on protected endpoints."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if not API_KEY:
            # No API_KEY configured — skip auth (dev mode)
            return f(*args, **kwargs)
        key = request.headers.get("X-API-Key") or request.args.get("apiKey")
        if key != API_KEY:
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def _utcnow():
    """Timezone-aware UTC now (replaces deprecated datetime.utcnow)."""
    return datetime.now(timezone.utc)


def _guest_payload(user_doc):
    from mongo_utils import serialize_guest

    return serialize_guest(user_doc)


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify(
        {
            "status": "healthy",
            "timestamp": _utcnow().isoformat(),
            "version": "2026.1.0",
        }
    )


@app.route("/api/stats", methods=["GET"])
@require_api_key
def event_stats():
    """Accurate admin counts via Mongo aggregation. Poll every 10s from admin UI."""
    try:
        from mongo_utils import get_event_stats

        stats = get_event_stats()
        return jsonify({"success": True, "stats": stats, "refreshSeconds": 10})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/guests", methods=["GET"])
@require_api_key
def list_all_guests():
    """List all guests with photo and document links for admin PDF preview & export."""
    try:
        from mongo_utils import get_all_guests

        guests = get_all_guests()
        return jsonify({
            "success": True,
            "count": len(guests),
            "guests": guests
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/token-series", methods=["GET"])
@require_api_key
def get_token_series():
    """Returns the current last guest token, total count, and next series range."""
    try:
        from mongo_utils import get_token_series_info
        info = get_token_series_info()
        return jsonify({"success": True, "series": info})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/guests/batch", methods=["POST"])
@require_api_key
def batch_add_guests():
    """
    Admin-only batch upload of up to 40 new guests.
    Enforces maximum 40 guests, duplicate checking, and records uploader name.
    """
    try:
        from mongo_utils import batch_insert_guests

        data = request.get_json() or {}
        guests = data.get("guests") or []
        uploader_name = str(data.get("uploaderName") or "").strip()

        if not uploader_name:
            return jsonify({"success": False, "message": "Uploader name is required for audit trail"}), 400

        if not guests:
            return jsonify({"success": False, "message": "No guests provided"}), 400

        if len(guests) > 40:
            return jsonify({
                "success": False,
                "message": f"Maximum 40 guests allowed per batch. Provided: {len(guests)}"
            }), 400

        result = batch_insert_guests(guests, uploader_name=uploader_name)
        status_code = 201 if result.get("success") else 400
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/scan/<token>", methods=["GET"])
@require_api_key
def scan_guest(token):
    """
    Single round-trip for scanners: guest profile + status.
    Prefer this over /user/token + /prasad/status on slow Wi‑Fi.
    """
    try:
        from mongo_utils import get_guest_by_token

        user = get_guest_by_token(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        payload = _guest_payload(user)
        return jsonify(
            {
                "success": True,
                "user": {k: v for k, v in payload.items() if k != "status"},
                "prasad": payload["status"],
                "cachedHint": True,
            }
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/user/token/<token>", methods=["GET"])
@require_api_key
def get_user_by_token(token):
    try:
        from mongo_utils import get_guest_by_token

        user = get_guest_by_token(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        payload = _guest_payload(user)
        user_obj = {k: v for k, v in payload.items() if k != "status"}
        return jsonify({"success": True, "user": user_obj})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/user/search", methods=["GET", "OPTIONS"])
@require_api_key
def search_user():
    """Universal Omni-Search across Name, Phone, Token, Email (or legacy firstName+phone)."""
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        from mongo_utils import search_guests_omni, get_guest_by_name_and_phone

        q = request.args.get("q") or request.args.get("query")
        if q:
            results = search_guests_omni(q)
            return jsonify({
                "success": True,
                "count": len(results),
                "results": results
            })

        first_name = request.args.get("firstName", "").strip()
        phone = request.args.get("phoneNumber", "").strip()

        if first_name and not phone:
            results = search_guests_omni(first_name)
            return jsonify({"success": True, "count": len(results), "results": results})
        if phone and not first_name:
            results = search_guests_omni(phone)
            return jsonify({"success": True, "count": len(results), "results": results})

        if not first_name and not phone:
            return jsonify({"error": "Search query or firstName/phoneNumber required", "results": []}), 400

        user = get_guest_by_name_and_phone(first_name, phone)
        if not user:
            results = search_guests_omni(first_name)
            if results:
                return jsonify({"success": True, "count": len(results), "results": results})
            return jsonify({"error": "Token not found", "results": []}), 404

        payload = _guest_payload(user)
        payload_data = {k: v for k, v in payload.items() if k != "status"}
        return jsonify({
            "success": True,
            "count": 1,
            "results": [payload],
            **payload_data
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/users", methods=["POST"])
@app.route("/api/user", methods=["POST"])  # alias — frontend historically used /api/user
@require_api_key
def create_user():
    """Create guest in Mongo (on-spot entry)."""
    try:
        from mongo_utils import get_guest_by_token, insert_guest

        data = request.get_json() or {}
        # Support both nested name and flat fields
        name = data.get("name") or {}
        first = name.get("firstName") or data.get("firstName") or ""
        middle = name.get("middleName") or data.get("middleName") or ""
        last = name.get("lastName") or data.get("lastName") or ""
        token = str(data.get("token") or "").strip()
        phone = str(data.get("phoneNumber") or "").strip()

        if not token or not first or not phone:
            return jsonify(
                {"success": False, "message": "token, firstName, phoneNumber required"}
            ), 400
        if get_guest_by_token(token):
            return jsonify({"success": False, "message": "Token already exists"}), 409

        guest = {
            "token": token,
            "name": {"firstName": first, "middleName": middle, "lastName": last},
            "age": data.get("age", ""),
            "gender": data.get("gender", ""),
            "phoneNumber": phone,
            "alternatePhoneNumber": data.get("alternatePhoneNumber", ""),
            "email": data.get("email", ""),
            "photo": data.get("photo", "") or data.get("photoUrl", ""),
            "document": data.get("document", "") or data.get("documentUrl", ""),
        }
        insert_guest(guest)
        return jsonify({"success": True, "user": _guest_payload(guest)}), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/prasad/status", methods=["GET"])
@require_api_key
def get_prasad_status():
    try:
        from mongo_utils import get_guest_by_token

        token = request.args.get("token", "").strip()
        user = get_guest_by_token(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        payload = _guest_payload(user)
        return jsonify({"prasad": payload["status"], "success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/checkin", methods=["POST"])
@app.route("/api/fast-checkin", methods=["POST"])
@require_api_key
def fast_checkin():
    """
    High-Performance Single-Trip Atomic Check-In (2026 Production):
    Combines guest lookup, authorization, atomic check-in, duplicate prevention,
    and user profile retrieval into a single <20ms API request.
    Payload: { "token": "...", "gate": "entry" | "prasad1" | "prasad2" | "prasad3" }
    """
    try:
        from mongo_utils import atomic_fast_checkin

        data = request.get_json() or {}
        token = str(data.get("token") or "").strip()
        gate = str(data.get("gate") or data.get("prasadType") or "entry").strip()

        if not token:
            return jsonify({"success": False, "message": "Token is required"}), 400

        result = atomic_fast_checkin(token, gate=gate)
        status_code = 200
        if not result.get("success"):
            if result.get("code") == "not_found":
                status_code = 404
            elif result.get("code") == "entry_required":
                status_code = 403
            else:
                status_code = 400

        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/prasad/update", methods=["POST"])
@require_api_key
def update_prasad():
    try:
        from mongo_utils import get_guest_by_token, update_guest_prasad_status

        data = request.get_json() or {}
        token = str(data.get("token") or "").strip()
        prasad_type = data.get("prasadType")
        user = get_guest_by_token(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        if not user.get("EntryGateStatus"):
            return jsonify(
                {
                    "success": False,
                    "message": "Guest has not completed entry gate yet",
                    "code": "entry_required",
                }
            ), 400
        if user.get(prasad_type):
            return jsonify(
                {
                    "success": True,
                    "message": "Prasad already marked",
                    "alreadySet": True,
                }
            )
        ok, reason = update_guest_prasad_status(token, prasad_type)
        if not ok:
            return jsonify(
                {"success": False, "message": f"Failed to update ({reason})"}
            ), 400
        return jsonify(
            {
                "success": True,
                "message": "Prasad status updated successfully",
                "alreadySet": reason == "already_set",
            }
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/prasad/entry", methods=["POST"])
@require_api_key
def prasad_entry():
    try:
        from mongo_utils import get_guest_by_token, update_guest_entry_status

        data = request.get_json() or {}
        token = str(data.get("token") or "").strip()
        user = get_guest_by_token(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        ok, reason = update_guest_entry_status(token)
        if not ok:
            return jsonify(
                {"success": False, "message": f"Failed to update entry ({reason})"}
            ), 500
        return jsonify(
            {
                "success": True,
                "message": "Entry recorded successfully"
                if reason == "updated"
                else "Entry already recorded",
                "alreadySet": reason == "already_set",
                "entry_id": f"entry_{token}_{_utcnow().isoformat()}",
            }
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/user/update-photo-doc", methods=["POST"])
@require_api_key
def update_photo_doc():
    try:
        from mongo_utils import update_guest_photo_doc

        data = request.get_json() or {}
        token = str(data.get("token") or "").strip()
        if not token:
            return jsonify({"success": False, "message": "Token is required"}), 400
        ok = update_guest_photo_doc(
            token, photo=data.get("photo"), document=data.get("document")
        )
        if not ok:
            return jsonify({"success": False, "message": "User not found"}), 404
        return jsonify({"success": True, "message": "Photo/document updated successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/update-sheet", methods=["POST"])
@require_api_key
def update_sheet():
    """Batch mirror Mongo → Google Sheets (write-behind). Not for scan path."""
    try:
        from mongo_utils import iter_guests_for_sheet
        from sheets_utils import sync_guests_to_sheet

        rows = list(iter_guests_for_sheet())
        result = sync_guests_to_sheet(rows)
        b = result.get("breakdown", {})
        entered = b.get("Entry Gate - Entered", 0)
        remaining = b.get("Entry Gate - Remaining", 0)
        p1 = b.get("Prasad 1 - Claimed", 0)
        p2 = b.get("Prasad 2 - Claimed", 0)
        p3 = b.get("Prasad 3 - Claimed", 0)
        summary_msg = f"Synced {result.get('rowCount', 0)} guests across 6 tabs (Entered: {entered}, Pending: {remaining}, Prasad: P1={p1}/P2={p2}/P3={p3})"
        return jsonify(
            {
                "success": True,
                "message": summary_msg,
                "data": result,
            }
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/check_qr", methods=["POST"])
@require_api_key
def check_qr():
    """Optional server-side QR decode (prefer on-device scan for speed)."""
    try:
        import cv2
        import numpy as np

        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400
        file = request.files["file"]
        buf = np.frombuffer(file.read(), np.uint8)
        frame = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"error": "Invalid image format"}), 400
        detector = cv2.QRCodeDetector()
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        decoded_info, points, _ = detector.detectAndDecode(gray)
        if decoded_info:
            return jsonify(
                {
                    "qr_data": decoded_info,
                    "points": points.tolist() if points is not None else None,
                }
            )
        return jsonify({"message": "No QR code detected"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/aws/presigned-upload", methods=["POST"])
@require_api_key
def get_presigned_upload():
    """
    Generate presigned S3 upload URL for client-side direct photo upload.
    Reduces API server CPU/bandwidth overhead on event day.
    """
    try:
        from aws_utils import generate_presigned_upload_url
        data = request.get_json() or {}
        token = data.get("token", "guest")
        file_name = data.get("fileName", f"{token}_{int(_utcnow().timestamp())}.jpg")
        object_key = f"photos/{file_name}"
        presigned = generate_presigned_upload_url(object_key)
        if not presigned:
            return jsonify({"success": False, "message": "AWS S3 client not configured or disabled"}), 503
        bucket_name = os.getenv("AWS_S3_PHOTO_BUCKET", "divine-event-photos-2026")
        aws_region = os.getenv("AWS_REGION", "us-east-1")
        photo_url = f"https://{bucket_name}.s3.{aws_region}.amazonaws.com/{object_key}"
        return jsonify({
            "success": True,
            "url": presigned["url"],
            "fields": presigned["fields"],
            "key": object_key,
            "photoUrl": photo_url
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Divine Energy Hub API 2026 on http://127.0.0.1:{port}")
    if not API_KEY:
        print("⚠ WARNING: API_KEY not set — endpoints are unauthenticated (dev mode)")
    try:
        app.run(debug=False, host="127.0.0.1", port=port)
    except OSError:
        fallback_port = 5001 if port == 5000 else 5000
        print(f"Port {port} blocked by Windows, starting on fallback http://127.0.0.1:{fallback_port}")
        app.run(debug=False, host="127.0.0.1", port=fallback_port)
