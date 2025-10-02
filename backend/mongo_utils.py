def update_guest_prasad_status(token, prasad_type):
    prasad_field_map = {
        'prasad1': 'prasad1',
        'prasad2': 'prasad2',
        'prasad3': 'prasad3',
    }
    field = prasad_field_map.get(prasad_type)
    if not field:
        return False
    result = guests_collection.update_one({"token": token}, {"$set": {field: True}})
    # Success if the document exists, even if already True
    return result.matched_count > 0
from pymongo import MongoClient
import os

MONGO_URI = "mongodb+srv://rajtilakjoshij_db_user:yEVlJaVc9ZU88iSV@cluster0.tmmz15k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client['divine_dashboard']  # Use your database name
guests_collection = db['guests']

def get_guest_by_token(token):
    return guests_collection.find_one({"token": token})

def get_guest_by_name_and_phone(first_name, phone):
    return guests_collection.find_one({"name.firstName": first_name, "phoneNumber": phone})

def update_guest_entry_status(token):
    result = guests_collection.update_one({"token": token}, {"$set": {"EntryGateStatus": True}})
    return result.modified_count > 0

def insert_guest(guest_data):
    return guests_collection.insert_one(guest_data)
