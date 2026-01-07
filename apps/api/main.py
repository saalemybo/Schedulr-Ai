from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, time, timedelta
from schedulr.db import engine, get_db
from schedulr.models import Base, Business, Service, Availability, Appointment
from schedulr.schemas import BusinessCreate, BusinessOut, ServiceCreate, ServiceOut, AvailabilityCreate, AppointmentCreate, AppointmentOut

app = FastAPI(title="Schedulr AI API", version="0.0.2")

# DEV ONLY: auto-create tables on startup
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
    return appt



