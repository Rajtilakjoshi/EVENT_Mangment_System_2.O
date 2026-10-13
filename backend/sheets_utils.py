"""
Google Sheets write-behind mirror (2026 Production Multi-Sheet Architecture).
Maintains dedicated synchronized tabs:
1. All Guests — Complete master guest directory
2. Entry Gate - Entered — Guests who scanned and entered
3. Entry Gate - Remaining — Pending guests not yet admitted
4. Prasad 1 - Claimed — Guests who received Counter 1 Prasad
5. Prasad 2 - Claimed — Guests who received Counter 2 Prasad
6. Prasad 3 - Claimed — Guests who received Counter 3 Prasad
"""

import os
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("sheets_utils")

_env_account = os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE", "")
if _env_account and os.path.isfile(_env_account):
    SERVICE_ACCOUNT_FILE = os.path.abspath(_env_account)
else:
    _cand1 = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json"))
    _cand2 = os.path.abspath(os.path.join(os.path.dirname(__file__), "serviceAccountKey.json"))
    SERVICE_ACCOUNT_FILE = _cand1 if os.path.isfile(_cand1) else _cand2

SPREADSHEET_ID = os.environ.get("GOOGLE_SPREADSHEET_ID", "")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

HEADERS = [
    "token",
    "firstName",
    "middleName",
    "lastName",
    "age",
    "gender",
    "phoneNumber",
    "alternatePhoneNumber",
    "email",
    "EntryGateStatus",
    "prasad1",
    "prasad2",
    "prasad3",
    "photo",
    "document",
    "updatedAt",
]

TAB_CONFIG = [
    {
        "title": "All Guests",
        "filter": lambda r: True,
        "description": "Complete master guest list",
    },
    {
        "title": "Entry Gate - Entered",
        "filter": lambda r: str(r[9]).upper() == "TRUE",
        "description": "Guests scanned and admitted at entry gate",
    },
    {
        "title": "Entry Gate - Remaining",
        "filter": lambda r: str(r[9]).upper() != "TRUE",
        "description": "Pending guests not yet entered",
    },
    {
        "title": "Prasad 1 - Claimed",
        "filter": lambda r: str(r[10]).upper() == "TRUE",
        "description": "Guests who received Prasad 1",
    },
    {
        "title": "Prasad 2 - Claimed",
        "filter": lambda r: str(r[11]).upper() == "TRUE",
        "description": "Guests who received Prasad 2",
    },
    {
        "title": "Prasad 3 - Claimed",
        "filter": lambda r: str(r[12]).upper() == "TRUE",
        "description": "Guests who received Prasad 3",
    },
]

_sheets_service = None


def _get_service():
    global _sheets_service
    if _sheets_service is not None:
        return _sheets_service
    if not SPREADSHEET_ID:
        raise RuntimeError("GOOGLE_SPREADSHEET_ID is not configured in environment")
    if not os.path.isfile(SERVICE_ACCOUNT_FILE):
        raise RuntimeError(f"Service account file not found: {SERVICE_ACCOUNT_FILE}")
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    _sheets_service = build("sheets", "v4", credentials=credentials, cache_discovery=False)
    return _sheets_service


def _ensure_tabs_exist(service, spreadsheet_id):
    """Ensure all required event tabs exist and have frozen header rows."""
    try:
        meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        existing = {sh["properties"]["title"]: sh["properties"]["sheetId"] for sh in meta.get("sheets", [])}
        requests = []

        # If old single tab 'Guests' exists and 'All Guests' does not, rename it
        if "Guests" in existing and "All Guests" not in existing:
            requests.append({
                "updateSheetProperties": {
                    "properties": {"sheetId": existing["Guests"], "title": "All Guests"},
                    "fields": "title"
                }
            })
            existing["All Guests"] = existing["Guests"]

        # Add missing sheets
        for tab in TAB_CONFIG:
            title = tab["title"]
            if title not in existing:
                requests.append({
                    "addSheet": {
                        "properties": {
                            "title": title,
                            "gridProperties": {"frozenRowCount": 1}
                        }
                    }
                })

        if requests:
            service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id, body={"requests": requests}
            ).execute()
            logger.info(f"Initialized {len(requests)} spreadsheet tabs/properties")
    except Exception as e:
        logger.warning(f"Notice while checking/creating sheet tabs: {e}")


def sync_guests_to_sheet(rows):
    """
    Batch mirror Mongo → Multi-Sheet Google Spreadsheet.
    Updates:
    1. All Guests
    2. Entry Gate - Entered
    3. Entry Gate - Remaining
    4. Prasad 1 - Claimed
    5. Prasad 2 - Claimed
    6. Prasad 3 - Claimed
    """
    try:
        service = _get_service()
    except Exception as e:
        logger.warning(f"Google Sheets service unavailable: {e}")
        return {
            "success": False,
            "error": str(e),
            "rowCount": 0,
            "syncedAt": None,
        }

    raw_rows = list(rows)

    try:
        # 1. Ensure tabs exist
        _ensure_tabs_exist(service, SPREADSHEET_ID)

        # 2. Batch clear existing ranges on all 6 tabs
        clear_ranges = [f"'{tab['title']}'!A:P" for tab in TAB_CONFIG]
        try:
            service.spreadsheets().values().batchClear(
                spreadsheetId=SPREADSHEET_ID,
                body={"ranges": clear_ranges}
            ).execute()
        except Exception as e:
            logger.warning(f"Batch clear notice (continuing with update): {e}")

        # 3. Build data updates for each tab with its filtered subset
        data_updates = []
        breakdown = {}

        for tab in TAB_CONFIG:
            title = tab["title"]
            filter_fn = tab["filter"]
            filtered = [r for r in raw_rows if filter_fn(r)]
            values = [HEADERS] + filtered
            data_updates.append({
                "range": f"'{title}'!A1",
                "values": values
            })
            breakdown[title] = len(filtered)

        # 4. Batch update all tabs in ONE network request
        result = service.spreadsheets().values().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={
                "valueInputOption": "RAW",
                "data": data_updates
            }
        ).execute()

        now_iso = datetime.now(timezone.utc).isoformat() + "Z"
        row_count = len(raw_rows)

        # 5. Track sync timestamp in MongoDB metrics for the admin dashboard
        try:
            from mongo_utils import record_sheet_sync_success
            record_sheet_sync_success(row_count)
        except Exception as e:
            logger.warning(f"Failed to record sync in metrics: {e}")

        return {
            "success": True,
            "updatedCells": result.get("totalUpdatedCells", 0),
            "rowCount": row_count,
            "breakdown": breakdown,
            "syncedAt": now_iso,
        }
    except Exception as e:
        logger.error(f"Google Sheets multi-tab batch update failed: {e}")
        return {
            "success": False,
            "error": f"Google Sheets API error: {str(e)}",
            "rowCount": 0,
            "syncedAt": None,
        }
