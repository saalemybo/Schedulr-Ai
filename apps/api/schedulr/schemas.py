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
