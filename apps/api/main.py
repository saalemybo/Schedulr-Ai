from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, time, timedelta, date as date_type
from schedulr.db import engine, get_db
from schedulr.models import Base, Business, Service, Availability, Appointment
from schedulr.schemas import BusinessCreate, BusinessOut, ServiceCreate, ServiceOut, AvailabilityCreate, AppointmentCreate, AppointmentOut, SlotsOut, SlotOut
from schedulr.google_calendar import build_oauth_flow, get_calendar_service, make_event_payload
from schedulr.models import GoogleCalendarConnection
import os
from zoneinfo import ZoneInfo



app = FastAPI(title="Schedulr AI API", version="0.0.2")

#auto-create tables on startup
Base.metadata.create_all(bind=engine)

#Helpers for time and weekday parsing
def _parse_hhmm(hhmm: str) -> time:
    h, m = hhmm.split(":")
    return time(int(h), int(m))

def _weekday_key(dt: datetime) -> str:
    # Python: Monday=0 ... Sunday=6
    keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    return keys[dt.weekday()]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/businesses", response_model=BusinessOut)
def create_business(payload: BusinessCreate, db: Session = Depends(get_db)):
    existing = db.query(Business).filter(Business.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="slug already exists")

    b = Business(name=payload.name, slug=payload.slug, timezone=payload.timezone)
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@app.get("/businesses/{slug}", response_model=BusinessOut)
def get_business(slug: str, db: Session = Depends(get_db)):
    b = db.query(Business).filter(Business.slug == slug).first()
    if not b:
        raise HTTPException(status_code=404, detail="business not found")
    return b

@app.post("/businesses/{slug}/services", response_model=ServiceOut)
def create_service(slug: str, payload: ServiceCreate, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.slug == slug).first()
    if not business:
        raise HTTPException(status_code=404, detail="business not found")

    svc = Service(business_id=business.id, name=payload.name, duration_min=payload.duration_min)
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@app.get("/businesses/{slug}/services", response_model=list[ServiceOut])
def list_services(slug: str, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.slug == slug).first()
    if not business:
        raise HTTPException(status_code=404, detail="business not found")

    services = db.query(Service).filter(Service.business_id == business.id).order_by(Service.id.asc()).all()
    return services


@app.post("/availability", status_code=201)
def add_availability(payload: AvailabilityCreate, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == payload.business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="business not found")

    a = Availability(
        business_id=payload.business_id,
        day_of_week=payload.day_of_week,
        open_time=payload.open_time,
        close_time=payload.close_time
    )
    db.add(a)
    db.commit()
    return {"status": "saved"}

@app.post("/appointments", response_model=AppointmentOut)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.slug == payload.business_slug).first()
    if not business:
        raise HTTPException(status_code=404, detail="business not found")

    service = (
        db.query(Service)
        .filter(Service.id == payload.service_id, Service.business_id == business.id)
        .first()
    )
    if not service:
        raise HTTPException(status_code=404, detail="service not found for this business")

    start_at = payload.start_at
    if start_at.tzinfo is None:
        raise HTTPException(status_code=400, detail="start_at must include a timezone offset")

    end_at = start_at + timedelta(minutes=service.duration_min)

    # 1) Availability check (must fit within at least one availability window that day)
    dow = _weekday_key(start_at)
    avails = (
        db.query(Availability)
        .filter(Availability.business_id == business.id, Availability.day_of_week == dow)
        .all()
    )
    if not avails:
        raise HTTPException(status_code=400, detail="business has no availability for that day")

    start_t = start_at.timetz().replace(tzinfo=None)
    end_t = end_at.timetz().replace(tzinfo=None)

    fits = False
    for a in avails:
        open_t = _parse_hhmm(a.open_time)
        close_t = _parse_hhmm(a.close_time)
        if open_t <= start_t and end_t <= close_t:
            fits = True
            break

    if not fits:
        raise HTTPException(status_code=400, detail="requested time is outside business hours")

    # 2) Conflict check (overlap)
    # Overlap rule: (start < existing_end) AND (end > existing_start)
    conflict = (
        db.query(Appointment)
        .filter(
            Appointment.business_id == business.id,
            Appointment.status == "booked",
            Appointment.start_at < end_at,
            Appointment.end_at > start_at,
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=409, detail="time slot already booked")

    appt = Appointment(
        business_id=business.id,
        service_id=service.id,
        customer_name=payload.customer_name,
        customer_email=str(payload.customer_email),
        start_at=start_at,
        end_at=end_at,
        status="booked",
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    # Google Calendar push (Phase 1)
    conn = (
        db.query(GoogleCalendarConnection)
        .filter(GoogleCalendarConnection.business_id == business.id)
        .first()
    )
    if conn:
        svc = get_calendar_service(conn.refresh_token)
        event = make_event_payload(
            summary=f"{service.name} - {payload.customer_name}",
            start_at=start_at,
            end_at=end_at,
            description=f"Booked via Schedulr AI. Customer: {payload.customer_email}",
        )
        created = svc.events().insert(calendarId=conn.calendar_id, body=event).execute()
        appt.google_event_id = created.get("id")
        db.commit()
        db.refresh(appt)

    return appt

@app.get("/integrations/google/start")
def google_start(business_slug: str, db: Session = Depends(get_db)):
    # Make sure business exists
    business = db.query(Business).filter(Business.slug == business_slug).first()
    if not business:
        raise HTTPException(status_code=404, detail="business not found")

    flow = build_oauth_flow()

    # IMPORTANT: set state to the business slug so callback can find it
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=business_slug,
    )

    return {"auth_url": auth_url}


@app.get("/integrations/google/callback")
def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    # Google returns `state` -> we use it as the business slug
    business = db.query(Business).filter(Business.slug == state).first()
    if not business:
        raise HTTPException(status_code=404, detail="business not found")

    flow = build_oauth_flow()
    flow.fetch_token(code=code)

    creds = flow.credentials
    if not creds.refresh_token:
        raise HTTPException(
            status_code=400,
            detail="no refresh_token returned; revoke app access in Google and reconnect",
        )

    existing = (
        db.query(GoogleCalendarConnection)
        .filter(GoogleCalendarConnection.business_id == business.id)
        .first()
    )
    if existing:
        existing.refresh_token = creds.refresh_token
        existing.calendar_id = "primary"
    else:
        db.add(
            GoogleCalendarConnection(
                business_id=business.id,
                refresh_token=creds.refresh_token,
                calendar_id="primary",
            )
        )

    db.commit()
    return {"status": "connected", "business_slug": business.slug, "calendar_id": "primary"}

#get available slots for a business and service on a given date
@app.get("/b/{slug}/slots", response_model=SlotsOut)
def get_slots(slug: str, date: str, service_id: int, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.slug == slug).first()
    if not business:
        raise HTTPException(status_code=404, detail="business not found")

    service = (
        db.query(Service)
        .filter(Service.id == service_id, Service.business_id == business.id)
        .first()
    )
    if not service:
        raise HTTPException(status_code=404, detail="service not found for this business")

    # Parse date (YYYY-MM-DD)
    try:
        day = datetime.fromisoformat(date).date()
    except Exception:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")

    tz = ZoneInfo(business.timezone)

    # Find availability windows for that weekday
    dow = _weekday_key(datetime(day.year, day.month, day.day))
    avails = (
        db.query(Availability)
        .filter(Availability.business_id == business.id, Availability.day_of_week == dow)
        .all()
    )
    if not avails:
        return {"business_slug": slug, "service_id": service_id, "date": date, "slots": []}

    # Fetch existing appts for that day
    day_start = datetime(day.year, day.month, day.day, 0, 0, tzinfo=tz)
    day_end = day_start + timedelta(days=1)

    appts = (
        db.query(Appointment)
        .filter(
            Appointment.business_id == business.id,
            Appointment.status == "booked",
            Appointment.start_at >= day_start,
            Appointment.start_at < day_end,
        )
        .all()
    )

    duration = timedelta(minutes=service.duration_min)
    step = timedelta(minutes=business.slot_step_min)
    buffer_td = timedelta(minutes=business.buffer_min)

    slots: list[SlotOut] = []

    for a in avails:
        open_t = _parse_hhmm(a.open_time)
        close_t = _parse_hhmm(a.close_time)

        window_start = datetime(day.year, day.month, day.day, open_t.hour, open_t.minute, tzinfo=tz)
        window_end = datetime(day.year, day.month, day.day, close_t.hour, close_t.minute, tzinfo=tz)

        # last possible start time must finish within business hours
        t = window_start
        last_start = window_end - duration
        while t <= last_start:
            candidate_start = t
            candidate_end = t + duration

            # Conflict check with symmetric buffer:
            # reject if candidate overlaps any appointment when padding both sides by buffer
            conflict = False
            for ap in appts:
                if candidate_start < (ap.end_at + buffer_td) and candidate_end > (ap.start_at - buffer_td):
                    conflict = True
                    break

            if not conflict:
                slots.append(SlotOut(start_at=candidate_start, end_at=candidate_end))

            t = t + step

    return {"business_slug": slug, "service_id": service_id, "date": date, "slots": slots}



