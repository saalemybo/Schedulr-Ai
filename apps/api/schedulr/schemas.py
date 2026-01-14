from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


class BusinessCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=80)
    timezone: str = "America/Los_Angeles"

class BusinessOut(BaseModel):
    id: int
    name: str
    slug: str
    timezone: str

    class Config:
        from_attributes = True

class MeBusinessOut(BusinessOut):
    role: str

class ServiceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    duration_min: int = Field(ge=5, le=480)


class ServiceOut(BaseModel):
    id: int
    business_id: int
    name: str
    duration_min: int

    class Config:
        from_attributes = True

class AvailabilityCreate(BaseModel):
    business_id: int
    day_of_week: str = Field(pattern="^(mon|tue|wed|thu|fri|sat|sun)$")
    open_time: str = Field(pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$")
    close_time: str = Field(pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$")

class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    duration_min: int | None = Field(default=None, ge=5, le=600)

class AvailabilityUpsert(BaseModel):
    day_of_week: str = Field(pattern="^(mon|tue|wed|thu|fri|sat|sun)$")
    open_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    close_time: str = Field(pattern=r"^\d{2}:\d{2}$")

class AvailabilityOut(BaseModel):
    id: int
    business_id: int
    day_of_week: str = Field(pattern="^(mon|tue|wed|thu|fri|sat|sun)$")
    open_time: str = Field(pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$")
    close_time: str = Field(pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$")

    class Config:
        from_attributes = True

class AppointmentCreate(BaseModel):
    business_slug: str
    service_id: int
    customer_name: str = Field(min_length=2, max_length=120)
    customer_email: EmailStr
    start_at: datetime  


class AppointmentOut(BaseModel):
    id: int
    business_id: int
    service_id: int
    customer_name: str
    customer_email: str
    start_at: datetime
    end_at: datetime
    status: str
    

    class Config:
        from_attributes = True

class SlotOut(BaseModel):
    start_at: datetime
    end_at: datetime

class SlotsOut(BaseModel):
    business_slug: str
    service_id: int
    date: str
    slots: list[SlotOut]


