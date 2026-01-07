from pydantic import BaseModel, Field


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

