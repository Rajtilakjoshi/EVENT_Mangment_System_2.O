@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import json
import os
from datetime import datetime


app = Flask(__name__)
# Set allowed origins for CORS
allowed_origins = [
    "http://localhost:3000",
    "https://final-event-mangement-app.vercel.app"
]
CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)

csv_data = []
csv_by_token = {}
csv_by_phone = {}
def load_csv_data():
    global csv_data, csv_by_token, csv_by_phone
    csv_data = []
    csv_by_token = {}
    csv_by_phone = {}
    with open(CSV_PATH, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            csv_data.append(row)
            csv_by_token[row['Token']] = row
            csv_by_phone[row['Phone Number']] = row
def save_csv_data():
    if not csv_data:
        return
    fieldnames = csv_data[0].keys()
    with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_data)
# (Removed duplicate CORS(app) call)

# Mock data storage (in production, use a real database)
users_db = {}
prasad_db = {}
uploads_db = {}

def detect_qr_code(frame):
    """Detect QR code in image frame"""
    detector = cv2.QRCodeDetector()
    gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    decoded_info, points, _ = detector.detectAndDecode(gray_frame)
    return decoded_info, points

@app.route('/api/update-sheet', methods=['POST'])
def update_sheet():
    """Update Google Sheet"""
    try:
        # Mock implementation - in production, integrate with Google Sheets API
        return jsonify({
            "success": True,
            "message": "Sheet updated successfully!",
            "data": {"updated_at": datetime.now().isoformat()}
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/users', methods=['POST'])
def create_user():
    """Create new user"""
    try:
        data = request.get_json()
        user_id = f"user_{len(users_db) + 1}"
        users_db[user_id] = {
            "id": user_id,
            "firstName": data.get('firstName'),
            "lastName": data.get('lastName'),
            "phoneNumber": data.get('phoneNumber'),
            "email": data.get('email'),
            "created_at": datetime.now().isoformat()
        }
        return jsonify({"success": True, "user": users_db[user_id]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/user/search', methods=['GET', 'OPTIONS'])
def search_user():
    """Search user by firstName and phoneNumber from Firestore"""
    try:
        from mongo_utils import get_guest_by_name_and_phone
        first_name = request.args.get('firstName', '').strip()
        phone = request.args.get('phoneNumber', '').strip()
        user = get_guest_by_name_and_phone(first_name, phone)
        if user:
            return jsonify({
                "token": user.get("Token", ""),
                "name": {
                    "firstName": user.get("NameFirst", ""),
                    "middleName": user.get("NameMiddle", ""),
                    "lastName": user.get("NameLast", "")
                },
                "age": user.get("Age", ""),
                "email": user.get("Email", ""),
                "phoneNumber": user.get("PhoneNumber", ""),
                "alternatePhoneNumber": user.get("AlternatePhoneNumber", ""),
                "gender": user.get("Gender", ""),
                "photoUrl": user.get("Photo", ""),
                "documentUrl": user.get("Document", "")
            })
        return jsonify({"error": "Token not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/user/token/<token>', methods=['GET'])
def get_user_by_token(token):
    """Get user by token from Firestore"""
    try:
        from mongo_utils import get_guest_by_token
        user = get_guest_by_token(token)
        if not user:
            print(f"[WARN] User not found for token: {token}")
            return jsonify({"success": False, "message": "User not found"}), 404
        # MongoDB returns _id as ObjectId, remove it for frontend
        user.pop('_id', None)
        user_obj = {
            "token": user.get("token", ""),
            "name": {
                "firstName": user.get("name", {}).get("firstName", ""),
                "middleName": user.get("name", {}).get("middleName", ""),
                "lastName": user.get("name", {}).get("lastName", "")
            },
            "age": user.get("age", ""),
            "email": user.get("email", ""),
            "phoneNumber": user.get("phoneNumber", ""),
            "alternatePhoneNumber": user.get("alternatePhoneNumber", ""),
            "gender": user.get("gender", ""),
            "photoUrl": user.get("photo", ""),
            "documentUrl": user.get("document", "")
        }
        return jsonify({"success": True, "user": user_obj})
    except Exception as e:
        import traceback
        print("[ERROR] Exception in get_user_by_token:")
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_photos():
    """Upload photos for user"""
    try:
        token = request.form.get('token')
        if not token:
            return jsonify({"success": False, "message": "Token is required"}), 400

        user = csv_by_token.get(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Accept 'image' (profile) and 'token_doc' (document)
        image_file = request.files.get('image')
        doc_file = request.files.get('token_doc')
        photo_url = user.get('Photo', '')
        doc_url = user.get('Document', '')
        upload_folder = os.path.join(os.path.dirname(__file__), '..', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)

        # Save profile photo
        if image_file:
            ext = os.path.splitext(image_file.filename)[1] or '.png'
            photo_filename = f"{token}_{user['name'].split()[-1]}.png"
            photo_path = os.path.join(upload_folder, photo_filename)
            image_file.save(photo_path)
            user['Photo'] = f"uploads/{photo_filename}"
            photo_url = user['Photo']

        # Save document photo
        if doc_file:
            ext = os.path.splitext(doc_file.filename)[1] or '.png'
            doc_filename = f"{token}_doc_{user['name'].split()[-1]}.png"
            doc_path = os.path.join(upload_folder, doc_filename)
            doc_file.save(doc_path)
            user['Document'] = f"uploads/{doc_filename}"
            doc_url = user['Document']

        save_csv_data()
        return jsonify({
            "success": True,
            "message": "Photos uploaded successfully",
            "photoUrl": photo_url,
            "documentUrl": doc_url
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/prasad/status', methods=['GET'])
def get_prasad_status():
    """Get prasad status by token from CSV"""
    try:
        from mongo_utils import get_guest_by_token
        token = request.args.get('token')
        user = get_guest_by_token(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        prasad_status = {
            "entryGate": user.get("EntryGateStatus", False),
            "prasad1": bool(user.get("prasad1", False)),
            "prasad2": bool(user.get("prasad2", False)),
            "prasad3": bool(user.get("prasad3", False))
        }
        return jsonify({"prasad": prasad_status, "success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/prasad/update', methods=['POST'])
def update_prasad():
    """Update prasad status and save to CSV"""
    try:
        from mongo_utils import get_guest_by_token, update_guest_prasad_status
        data = request.get_json()
        token = data.get('token')
        prasad_type = data.get('prasadType')
        print(f"[DEBUG] /api/prasad/update called with token={token}, prasadType={prasad_type}")
        user = get_guest_by_token(token)
        if not user:
            print(f"[DEBUG] User not found for token: {token}")
            return jsonify({"success": False, "message": "User not found"}), 404
        updated = update_guest_prasad_status(token, prasad_type)
        if not updated:
            print(f"[DEBUG] Failed to update prasad status for token={token}, prasadType={prasad_type}")
            return jsonify({"success": False, "message": "Failed to update prasad status"}), 500
        print(f"[DEBUG] Prasad status updated for token={token}, prasadType={prasad_type}")
        return jsonify({
            "success": True,
            "message": "Prasad status updated successfully"
        })
    except Exception as e:
        print(f"[ERROR] Exception in /api/prasad/update: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/prasad/entry', methods=['POST'])
def prasad_entry():
    """Handle prasad entry and save to CSV"""
    try:
        from mongo_utils import get_guest_by_token, update_guest_entry_status
        data = request.get_json()
        token = data.get('token')
        user = get_guest_by_token(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        # Update entry gate status in MongoDB
        updated = update_guest_entry_status(token)
        if not updated:
            return jsonify({"success": False, "message": "Failed to update entry status"}), 500
        entry_id = f"entry_{token}_{datetime.now().isoformat()}"
        return jsonify({
            "success": True,
            "message": "Entry recorded successfully",
            "entry_id": entry_id
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/check_qr', methods=['POST'])
def check_qr():
    """Check QR code from uploaded image"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        
        # Read the file into a NumPy array
        in_memory_file = np.frombuffer(file.read(), np.uint8)
        frame = cv2.imdecode(in_memory_file, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Invalid image format'}), 400

        # Detect QR code in the frame
        qr_data, points = detect_qr_code(frame)

        if qr_data:
            response = {
                'qr_data': qr_data,
                'points': points.tolist() if points is not None else None
            }
            return jsonify(response)
        else:
            return jsonify({'message': 'No QR code detected'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })

if __name__ == '__main__':
    print("🚀 Starting Divine Energy Hub Backend Server...")
    print("📍 Backend will be available at: http://localhost:8080")
    print("🔗 API endpoints available at: http://localhost:8080/api/")
    app.run(debug=False, host='0.0.0.0', port=8080)
