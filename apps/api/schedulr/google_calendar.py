import os
from datetime import datetime
from typing import Optional

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from datetime import datetime
from typing import List, Tuple

def _parse_rfc3339(dt_str: str) -> datetime:
    # Google often returns ...Z for UTC; python fromisoformat doesn't accept 'Z'
    if dt_str.endswith("Z"):
        dt_str = dt_str[:-1] + "+00:00"
    return datetime.fromisoformat(dt_str)

def get_busy_intervals(service, calendar_id: str, time_min: datetime, time_max: datetime) -> List[Tuple[datetime, datetime]]:
    """
    Returns list of (start, end) busy datetimes for calendar in [time_min, time_max)
    """
    body = {
        "timeMin": time_min.isoformat(),
        "timeMax": time_max.isoformat(),
        "items": [{"id": calendar_id}],
    }
    resp = service.freebusy().query(body=body).execute()
    calendars = resp.get("calendars", {})
    cal = calendars.get(calendar_id, {})
    busy = cal.get("busy", [])

    intervals = []
    for b in busy:
        start = _parse_rfc3339(b["start"])
        end = _parse_rfc3339(b["end"])
        intervals.append((start, end))
    return intervals


SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",  # needed for freeBusy
    "https://www.googleapis.com/auth/calendar.events",    # needed for inserting events
]


def build_oauth_flow() -> Flow:
    client_id = os.environ["GOOGLE_CLIENT_ID"]
    client_secret = os.environ["GOOGLE_CLIENT_SECRET"]
    redirect_uri = os.environ["GOOGLE_REDIRECT_URI"]

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )
    return flow


def get_calendar_service(refresh_token: str):
    client_id = os.environ["GOOGLE_CLIENT_ID"]
    client_secret = os.environ["GOOGLE_CLIENT_SECRET"]

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=SCOPES,
    )
    return build("calendar", "v3", credentials=creds)


def make_event_payload(
    summary: str,
    start_at: datetime,
    end_at: datetime,
    description: Optional[str] = None,
):
    return {
        "summary": summary,
        "description": description or "",
        "start": {"dateTime": start_at.isoformat()},
        "end": {"dateTime": end_at.isoformat()},
    }
