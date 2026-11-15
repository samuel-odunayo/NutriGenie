from sqlalchemy import Column, Integer, String, Float, Boolean
from app.core.database import Base


class HealthFacility(Base):
    __tablename__ = "health_facilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    facility_type = Column(String(50), nullable=False)  # PHC, CHW, AgroMarket
    ward_name = Column(String(80), nullable=False)      # E.g. Bwari Central, Kuje Ward
    state = Column(String(50), default="FCT")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_phone = Column(String(20), nullable=True)
    operating_hours = Column(String(50), default="24/7 (Emergency)")
    has_nutrition_clinic = Column(Boolean, default=True)
    has_ussd_dispatch = Column(Boolean, default=True)


class WardVulnerability(Base):
    __tablename__ = "ward_vulnerabilities"

    id = Column(Integer, primary_key=True, index=True)
    ward_name = Column(String(80), unique=True, nullable=False)
    lga = Column(String(80), nullable=False)
    state = Column(String(50), default="FCT")
    population = Column(Integer, default=25000)
    iron_deficiency_pct = Column(Float, default=38.5)
    vitamin_a_deficiency_pct = Column(Float, default=29.0)
    stunting_risk_level = Column(String(20), default="Moderate")  # High, Moderate, Low
    active_chw_count = Column(Integer, default=6)
