import csv
import re

INPUT_CSV = 'Divine - Admin Use.csv'  # Your original CSV file
OUTPUT_CSV = 'Divine-Uniform.csv'    # The new, cleaned CSV file

# Columns for the new CSV
FIELDNAMES = [
    'token', 'firstName', 'middleName', 'lastName',
    'phoneNumber', 'alternatePhoneNumber', 'age', 'email', 'gender',
    'photo', 'document', 'EntryGateStatus', 'Gate1Status', 'Gate2Status', 'Gate3Status'
]

def split_full_name(full_name):
    parts = re.split(r'\s+', full_name.strip())
    if len(parts) == 1:
        return parts[0], '', ''
    elif len(parts) == 2:
        return parts[0], '', parts[1]
    else:
        return parts[0], ' '.join(parts[1:-1]), parts[-1]

with open(INPUT_CSV, encoding='utf-8') as fin, open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as fout:
    reader = csv.DictReader(fin)
    writer = csv.DictWriter(fout, fieldnames=FIELDNAMES)
    writer.writeheader()
    for row in reader:
        token = row['Token']
        full_name = row.get('Name', '') or ' '.join([
            row.get('NameFirst', ''),
            row.get('NameMiddle', ''),
            row.get('NameLast', '')
        ]).strip()
        first, middle, last = split_full_name(full_name)
        writer.writerow({
            'token': token,
            'firstName': first,
            'middleName': middle,
            'lastName': last,
            'phoneNumber': row.get('Phone Number', ''),
            'alternatePhoneNumber': row.get('Alternate Phone Number', ''),
            'age': row.get('Age', ''),
            'email': row.get('Email', ''),
            'gender': row.get('Gender', ''),
            'photo': row.get('Photo', ''),
            'document': row.get('Document', ''),
            'EntryGateStatus': row.get('EntryGateStatus', ''),
            'Gate1Status': row.get('Gate1Status', ''),
            'Gate2Status': row.get('Gate2Status', ''),
            'Gate3Status': row.get('Gate3Status', '')
        })
print(f"Uniform CSV created as {OUTPUT_CSV}")
