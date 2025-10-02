import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Path to your service account key file
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), '../divine-36910-845acdd525e0.json')

# The ID and range of your spreadsheet
SPREADSHEET_ID = '1IXFU9OYLYatew3C7bQyCoPIDELrFwU9A8k6dLOBZ94k'
SHEET_NAME = 'Sheet1'  # Change if your sheet/tab name is different

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)

sheets_service = build('sheets', 'v4', credentials=credentials)

def append_row_to_sheet(row_data):
    """Append a row to the Google Sheet."""
    body = {'values': [row_data]}
    result = sheets_service.spreadsheets().values().append(
        spreadsheetId=SPREADSHEET_ID,
        range=f'{SHEET_NAME}!A1',
        valueInputOption='USER_ENTERED',
        body=body
    ).execute()
    return result

def update_cell_in_sheet(row, col, value):
    """Update a specific cell in the Google Sheet."""
    range_ = f'{SHEET_NAME}!{col}{row}'
    body = {'values': [[value]]}
    result = sheets_service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=range_,
        valueInputOption='USER_ENTERED',
        body=body
    ).execute()
    return result
