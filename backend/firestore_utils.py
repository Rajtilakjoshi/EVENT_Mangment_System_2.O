
import os
import firebase_admin
from firebase_admin import credentials, firestore, storage

# Path to your service account key file for divine-36910 (guests & storage)
SERVICE_ACCOUNT_FILE_GUESTS = os.path.join(os.path.dirname(__file__), '../divine-36910-firebase-adminsdk-fbsvc-414019061e.json')

if not firebase_admin._apps:
    cred_guests = credentials.Certificate(SERVICE_ACCOUNT_FILE_GUESTS)
    firebase_admin.initialize_app(cred_guests, {
        'storageBucket': 'divine-36910.appspot.com'
    }, name='guests')

app_guests = firebase_admin.get_app('guests')
db = firestore.client(app_guests)
bucket = storage.bucket(app_guests)


def get_guest_by_token(token):
    guests_ref = db.collection('guests')
    query = guests_ref.where('Token', '==', token).limit(1).stream()
    for doc in query:
        return doc.to_dict()
    return None


def get_guest_by_name_and_phone(first_name, phone):
    guests_ref = db.collection('guests')
    query = guests_ref.where('NameFirst', '==', first_name).where('PhoneNumber', 'in', [phone, '']).limit(1).stream()
    for doc in query:
        return doc.to_dict()
    # Try alternate phone
    query_alt = guests_ref.where('NameFirst', '==', first_name).where('AlternatePhoneNumber', '==', phone).limit(1).stream()
    for doc in query_alt:
        return doc.to_dict()
    return None


def update_guest_entry_status(token):
    guests_ref = db.collection('guests')
    query = guests_ref.where('Token', '==', token).limit(1).stream()
    for doc in query:
        doc_ref = guests_ref.document(doc.id)
        doc_ref.update({'EntryGateStatus': True})
        return True
    return False
