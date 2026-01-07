from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from schedulr.db import engine, get_db
from schedulr.models import Base, Business, Service
from schedulr.schemas import BusinessCreate, BusinessOut, ServiceCreate, ServiceOut

app = FastAPI(title="Schedulr AI API", version="0.0.2")

# DEV ONLY: auto-create tables on startup
Base.metadata.create_all(bind=engine)


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

