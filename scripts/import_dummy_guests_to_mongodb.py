"""
Divine Energy Hub — Import Dummy Guests from CSV to MongoDB (2026)
Imports records from 'asthamashibir25 - dummy data.csv' directly into MongoDB.
Features:
- Reads MONGO_URI from backend/.env (or prompts interactively).
- Upserts records by token so running multiple times is 100% idempotent and safe.
- Creates proper unique indexes on 'token'.
"""

import os
import sys
import csv
from datetime import datetime, timezone

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Load environment variables
from dotenv import load_dotenv

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(project_root, ".env"))
load_dotenv(os.path.join(project_root, "backend", ".env"))

CSV_PATH = os.path.join(project_root, "asthamashibir25 - dummy data.csv")
if not os.path.isfile(CSV_PATH):
    # Fallback check in data/samples
    CSV_PATH = os.path.join(project_root, "data", "samples", "asthamashibir_dummy_data.csv")

def import_dummy_data():
    print("=" * 65)
    print("  IMPORT DUMMY GUESTS TO MONGODB (2026)")
    print("=" * 65)
    
    if not os.path.isfile(CSV_PATH):
        print(f"❌ Error: CSV file not found at: {CSV_PATH}")
        sys.exit(1)
        
    print(f"📄 Found CSV data file: {os.path.basename(CSV_PATH)}")
    
    # Get MongoDB URI
    mongo_uri = os.environ.get("MONGO_URI")
    db_name = os.environ.get("MONGO_DB", "divine_dashboard_2026")
    
    if not mongo_uri or "localhost" in mongo_uri:
        print("\nℹ️  Current MONGO_URI is set to local:", mongo_uri or "None")
        print("   If you have a MongoDB Atlas cloud URI, enter it below.")
        print("   Press ENTER to use existing URI from backend/.env.")
        try:
            custom_uri = input("\n👉 Enter MongoDB Connection URI (or press ENTER): ").strip()
            if custom_uri:
                mongo_uri = custom_uri
        except (EOFError, KeyboardInterrupt):
            pass

    if not mongo_uri:
        mongo_uri = "mongodb://localhost:27017/divine_dashboard_2026"
        
    print(f"\n🔌 Connecting to MongoDB Database: '{db_name}'...")
    try:
        from pymongo import MongoClient, ASCENDING, UpdateOne
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        # Test connection
        client.admin.command("ping")
        print("✅ MongoDB Connection Successful!")
    except Exception as e:
        print(f"\n❌ Connection Failed: {e}")
        print("\n💡 Troubleshooting Tips:")
        print("1. If using MongoDB Atlas:")
        print("   - Check that your username & password in the URI are correct.")
        print("   - In Atlas -> 'Network Access', make sure '0.0.0.0/0' (Allow anywhere) is enabled.")
        print("2. If using Local MongoDB:")
        print("   - Ensure MongoDB service is running or run: docker run -d -p 27017:27017 mongo:7.0")
        sys.exit(1)
        
    db = client[db_name]
    guests_col = db["guests"]
    
    # Ensure index on token
    guests_col.create_index([("token", ASCENDING)], unique=True, background=True)
    guests_col.create_index([("name.firstName", ASCENDING), ("phoneNumber", ASCENDING)], background=True)
    
    print("\n📦 Reading CSV and preparing guest records...")
    operations = []
    count = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    
    with open(CSV_PATH, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            token = str(row.get("token") or "").strip()
            if not token:
                continue
                
            first_name = str(row.get("firstName") or "").strip()
            middle_name = str(row.get("middleName") or "").strip()
            last_name = str(row.get("lastName") or "").strip()
            phone = str(row.get("phoneNumber") or "").strip()
            alt_phone = str(row.get("alternatePhoneNumber") or "").strip()
            email = str(row.get("email") or "").strip()
            gender = str(row.get("gender") or "").strip()
            age_raw = str(row.get("age") or "").strip()
            age = int(age_raw) if age_raw.isdigit() else ""
            
            guest_doc = {
                "token": token,
                "name": {
                    "firstName": first_name,
                    "middleName": middle_name,
                    "lastName": last_name,
                },
                "phoneNumber": phone,
                "alternatePhoneNumber": alt_phone,
                "email": email,
                "gender": gender,
                "age": age,
                "EntryGateStatus": False,
                "prasad1": False,
                "prasad2": False,
                "prasad3": False,
                "photo": "",
                "document": "",
                "updatedAt": now_iso,
            }
            
            # Idempotent upsert
            operations.append(
                UpdateOne(
                    {"token": token},
                    {"$set": guest_doc},
                    upsert=True
                )
            )
            count += 1
            
    if operations:
        print(f"🚀 Executing bulk upsert of {count} guests into '{db_name}.guests'...")
        result = guests_col.bulk_write(operations)
        print(f"✅ Import Successful!")
        print(f"   • Total records in CSV:     {count}")
        print(f"   • New records inserted:     {result.upserted_count}")
        print(f"   • Existing records updated:  {result.modified_count}")
        print(f"   • Database total guests:    {guests_col.count_documents({})}")
    else:
        print("⚠️ No valid records found in CSV.")
        
    print("\n" + "=" * 65)
    print("  DATA IMPORT FINISHED SUCCESSFULLY!")
    print("  You can now scan tokens like 24Dummy001, 24Dummy002, etc.")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    import_dummy_data()
