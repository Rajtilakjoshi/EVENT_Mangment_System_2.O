import os
import sys

from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

uri = os.environ.get("MONGO_URI")
if not uri:
    print("MONGO_URI not set")
    sys.exit(1)

from pymongo import MongoClient

client = MongoClient(uri, serverSelectionTimeoutMS=5000)
print(client.admin.command("ping"))
print("Mongo OK")
