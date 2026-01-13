from sqlalchemy import DateTime, ForeignKey, Integer, String, func, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass

#business table storing business info and included services
class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="America/Los_Angeles")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    buffer_min: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    slot_step_min: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    services: Mapped[list["Service"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    availability: Mapped[list["Availability"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    members: Mapped[list["BusinessMember"]] = relationship(back_populates="business", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    memberships: Mapped[list["BusinessMember"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class BusinessMember(Base):
    __tablename__ = "business_members"
    __table_args__ = (
        UniqueConstraint("user_id", "business_id", name="uq_user_business"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="OWNER")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="memberships")
    business: Mapped["Business"] = relationship(back_populates="members")

#service table storing services offered by businesses
class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False, default=30)

    business: Mapped["Business"] = relationship(back_populates="services")

#availability table storing business hours
class Availability(Base):
    __tablename__ = "availability"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    day_of_week: Mapped[str] = mapped_column(String(16), nullable=False)  # "mon", "tue", etc.
    open_time: Mapped[str] = mapped_column(String(5), nullable=False)     # "09:00"
    close_time: Mapped[str] = mapped_column(String(5), nullable=False)    # "17:00"

    business: Mapped["Business"] = relationship(back_populates="availability")

#appointment table storing customer appointments
class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), index=True)

    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=False)

    start_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), index=True)
    end_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), index=True)

    status: Mapped[str] = mapped_column(String(24), nullable=False, default="booked")

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    google_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)



class GoogleCalendarConnection(Base):
    __tablename__ = "google_calendar_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), unique=True, index=True)

    refresh_token: Mapped[str] = mapped_column(String(2048), nullable=False)
    calendar_id: Mapped[str] = mapped_column(String(255), nullable=False, default="primary")

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())



