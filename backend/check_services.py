"""
Divine Energy Hub — Comprehensive Service Connectivity Diagnostics (2026)
Tests connectivity and configuration for:
1. MongoDB / DocumentDB (Primary transactional store)
2. AWS S3 (Cloud photo storage & presigned URLs)
3. AWS SES (Transactional email delivery)
4. Google Sheets (Write-behind reporting mirror)
"""

import sys
import os
import time

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

def check_mongodb():
    """Verify MongoDB / DocumentDB connectivity and collection indexes."""
    uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/divine_dashboard_2026")
    db_name = os.environ.get("MONGO_DB", "divine_dashboard_2026")
    print(f"\n[1/4] Checking MongoDB ({db_name})...")
    try:
        from pymongo import MongoClient
        t0 = time.time()
        client = MongoClient(uri, serverSelectionTimeoutMS=2000)
        res = client.admin.command("ping")
        latency = round((time.time() - t0) * 1000, 2)
        print(f"  [OK] MongoDB Connected! Latency: {latency} ms")
        db = client[db_name]
        count = db["guests"].count_documents({})
        print(f"  [INFO] Guests collection accessible: {count} guest records found.")
        return {"service": "MongoDB", "status": "CONNECTED", "latencyMs": latency, "details": f"{count} records"}
    except Exception as e:
        print(f"  [STANDBY] Local MongoDB not running on {uri}")
        print("     (Note: mongomock handles unit tests; for live testing, run docker-compose up or add Atlas URI to backend/.env)")
        return {"service": "MongoDB", "status": "STANDBY / MOCK READY", "details": "Local server offline"}

def check_aws_s3():
    """Verify AWS S3 client initialization and presigned URL capability."""
    print("\n[2/4] Checking AWS S3 Object Storage...")
    try:
        import aws_utils
        s3 = aws_utils.get_s3_client()
        if not s3:
            print("  [WARN] AWS S3 Client: Boto3 client not initialized")
            return {"service": "AWS S3", "status": "NOT CONFIGURED"}
        
        presigned = aws_utils.generate_presigned_upload_url("test_diagnostic_photo.jpg")
        if presigned and "url" in presigned:
            print(f"  [OK] AWS S3 Presigned URL Generation: SUCCESS")
            print(f"     Target Bucket: {aws_utils.S3_BUCKET} | Region: {aws_utils.AWS_REGION}")
            return {"service": "AWS S3", "status": "CONNECTED", "details": f"Bucket: {aws_utils.S3_BUCKET}"}
        else:
            print(f"  [READY] AWS S3 Module ready (Configure AWS_ACCESS_KEY_ID or IAM role for live bucket operations)")
            return {"service": "AWS S3", "status": "MODULE READY", "details": f"Bucket: {aws_utils.S3_BUCKET}"}
    except Exception as e:
        print(f"  [NOTICE] AWS S3: {e}")
        return {"service": "AWS S3", "status": "STANDBY", "details": str(e)}

def check_aws_ses():
    """Verify AWS SES email client initialization."""
    print("\n[3/4] Checking AWS SES (Simple Email Service)...")
    try:
        import aws_utils
        ses = aws_utils.get_ses_client()
        if not ses:
            print("  [WARN] AWS SES Client: Boto3 client not initialized")
            return {"service": "AWS SES", "status": "NOT CONFIGURED"}
        print(f"  [OK] AWS SES Client initialized (Sender: {aws_utils.SES_SENDER} | Region: {aws_utils.AWS_REGION})")
        return {"service": "AWS SES", "status": "INITIALIZED", "details": aws_utils.SES_SENDER}
    except Exception as e:
        print(f"  [NOTICE] AWS SES: {e}")
        return {"service": "AWS SES", "status": "STANDBY", "details": str(e)}

def check_google_sheets():
    """Verify Google Sheets API service account and target spreadsheet."""
    print("\n[4/4] Checking Google Sheets Service Account...")
    try:
        import sheets_utils
        service_file = sheets_utils.SERVICE_ACCOUNT_FILE
        sheet_id = sheets_utils.SPREADSHEET_ID
        
        if not os.path.isfile(service_file):
            print(f"  [NOTICE] Service Account file not found at: {service_file}")
            return {"service": "Google Sheets", "status": "KEY FILE MISSING"}
        
        if not sheet_id:
            print(f"  [READY] Service Account key found ({os.path.basename(service_file)}), awaiting GOOGLE_SPREADSHEET_ID.")
            return {"service": "Google Sheets", "status": "CREDENTIAL READY", "details": "Needs SPREADSHEET_ID"}
        
        service = sheets_utils._get_service()
        if service:
            print(f"  [OK] Google Sheets API Connected! Spreadsheet ID: {sheet_id[:10]}...")
            return {"service": "Google Sheets", "status": "CONNECTED", "details": f"ID: {sheet_id[:10]}..."}
        return {"service": "Google Sheets", "status": "UNAVAILABLE"}
    except Exception as e:
        print(f"  [NOTICE] Google Sheets: {e}")
        return {"service": "Google Sheets", "status": "STANDBY", "details": str(e)}

def main():
    print("=" * 65)
    print("  DIVINE ENERGY HUB 2026 — SERVICE CONNECTIVITY DIAGNOSTIC")
    print("=" * 65)
    
    results = [
        check_mongodb(),
        check_aws_s3(),
        check_aws_ses(),
        check_google_sheets(),
    ]
    
    print("\n" + "=" * 65)
    print(f"{'SERVICE':<20} | {'STATUS':<25} | {'DETAILS'}")
    print("-" * 65)
    for r in results:
        details = r.get("details", "")[:25]
        print(f"{r['service']:<20} | {r['status']:<25} | {details}")
    print("=" * 65)
    print("Diagnostics complete.\n")

if __name__ == "__main__":
    main()
