from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.core.database import Base


class PatientReferral(Base):
    __tablename__ = "patient_referrals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    chw_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    facility_id = Column(Integer, ForeignKey("health_facilities.id", ondelete="SET NULL"), nullable=True)
    
    patient_name = Column(String(100), nullable=False)
    patient_phone = Column(String(30), nullable=False)
    patient_category = Column(String(50), default="Pregnant Mother")  # Pregnant Mother, Nursing Mother, Infant, Child
    ward_name = Column(String(80), nullable=False)
    chw_name = Column(String(100), nullable=False)
    phc_name = Column(String(120), nullable=False)
    diagnosis_reason = Column(Text, nullable=False)  # E.g. "Severe Iron Deficiency / Anemia Risk"
    scheduled_date = Column(String(50), default="Tuesday 9:00 AM")
    status = Column(String(30), default="PENDING")   # PENDING, ATTENDED, COMPLETED, NO_SHOW
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
