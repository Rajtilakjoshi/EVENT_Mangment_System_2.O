from pymongo import MongoClient

MONGO_URI = "mongodb+srv://rajtilakjoshij_db_user:yEVlJaVc9ZU88iSV@cluster0.tmmz15k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)

def test_connection():
    try:
        # The ismaster command is cheap and does not require auth.
        client.admin.command('ismaster')
        print("MongoDB connection successful!")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")

if __name__ == "__main__":
    test_connection()
