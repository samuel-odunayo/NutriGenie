from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(String(30), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(30), default="CITIZEN")  # CITIZEN, CHW, PHC_ADMIN
    patient_category = Column(String(50), default="General Citizen")  # Pregnant Mother, Nursing Mother, Infant, Child, General Citizen
    ward_name = Column(String(80), nullable=True)
    state = Column(String(50), default="FCT")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
