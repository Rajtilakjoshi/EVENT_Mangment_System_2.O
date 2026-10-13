"""Import guests CSV into MongoDB (live source of truth for 2026)."""
import csv
import os
import sys

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()
load_dotenv(os.path.join("backend", ".env"))

MONGO_URI = os.environ.get("MONGO_URI")
if not MONGO_URI:
    print("Set MONGO_URI in .env or backend/.env")
    sys.exit(1)

client = MongoClient(MONGO_URI)
db = client[os.environ.get("MONGO_DB", "divine_dashboard")]
guests_collection = db["guests"]

CSV_FILE = sys.argv[1] if len(sys.argv) > 1 else "asthamashibir_dummy_data.csv"


def str_to_bool(val):
    return str(val).strip().lower() in ("true", "1", "yes")


with open(CSV_FILE, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        token = row.get("Token") or row.get("token")
        if not token:
            continue
        doc_data = {
            "token": token,
            "name": {
                "firstName": row.get("firstName", "") or row.get("NameFirst", ""),
                "middleName": row.get("middleName", "") or row.get("NameMiddle", ""),
                "lastName": row.get("lastName", "") or row.get("NameLast", ""),
            },
            "phoneNumber": row.get("phoneNumber", "") or row.get("PhoneNumber", ""),
            "alternatePhoneNumber": row.get("alternatePhoneNumber", "")
            or row.get("AlternatePhoneNumber", ""),
            "age": row.get("age", "") or row.get("Age", ""),
            "email": row.get("email", "") or row.get("Email", ""),
            "gender": row.get("gender", "") or row.get("Gender", ""),
            "photo": row.get("photo", "") or row.get("Photo", ""),
            "document": row.get("document", "") or row.get("Document", ""),
            "EntryGateStatus": str_to_bool(row.get("EntryGateStatus", False)),
            "prasad1": str_to_bool(row.get("prasad1", False)),
            "prasad2": str_to_bool(row.get("prasad2", False)),
            "prasad3": str_to_bool(row.get("prasad3", False)),
        }
        guests_collection.replace_one({"token": token}, doc_data, upsert=True)
        print(f"Imported guest {token}")

print("All guests imported!")
