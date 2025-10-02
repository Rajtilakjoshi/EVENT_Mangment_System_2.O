import csv
from pymongo import MongoClient
import re

MONGO_URI = "mongodb+srv://rajtilakjoshij_db_user:yEVlJaVc9ZU88iSV@cluster0.tmmz15k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client['divine_dashboard']
guests_collection = db['guests']

CSV_FILE = 'Divine-Uniform.csv'  # Your CSV file

def str_to_bool(val):
    return str(val).strip().lower() in ('true', '1', 'yes')

def split_full_name(full_name):
    parts = re.split(r'\s+', full_name.strip())
    if len(parts) == 1:
        return parts[0], '', ''
    elif len(parts) == 2:
        return parts[0], '', parts[1]
    else:
        return parts[0], ' '.join(parts[1:-1]), parts[-1]

with open(CSV_FILE, encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        token = row['Token']
        doc_data = {
            "token": token,
            "name": {
                "firstName": row.get("firstName", ""),
                "middleName": row.get("middleName", ""),
                "lastName": row.get("lastName", "")
            },
            "phoneNumber": row.get("phoneNumber", ""),
            "alternatePhoneNumber": row.get("alternatePhoneNumber", ""),
            "age": row.get("age", ""),
            "email": row.get("email", ""),
            "gender": row.get("gender", ""),
            "photo": row.get("photo", ""),
            "document": row.get("document", ""),
            "EntryGateStatus": str_to_bool(row.get("EntryGateStatus", False)),
            "Gate1Status": str_to_bool(row.get("Gate1Status", False)),
            "Gate2Status": str_to_bool(row.get("Gate2Status", False)),
            "Gate3Status": str_to_bool(row.get("Gate3Status", False))
        }
        guests_collection.replace_one({"token": token}, doc_data, upsert=True)
        print(f"Imported guest {token}")
print("All guests imported!")