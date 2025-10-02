import importlib

dependencies = [
    "flask",
    "flask_cors",
    "cv2",
    "numpy",
    "PIL",
    "dotenv",
    "pymongo",
    "firebase_admin",
    "google.cloud.storage",
    "google.cloud.firestore",
    "requests",
    "dns"
]

failed = []

print("Checking dependencies...\n")
for dep in dependencies:
    try:
        importlib.import_module(dep)
        print(f"✅ {dep} - OK")
    except ImportError as e:
        print(f"❌ {dep} - MISSING ({e})")
        failed.append(dep)

if not failed:
    print("\nAll dependencies are installed!")
else:
    print("\nMissing dependencies:", failed)