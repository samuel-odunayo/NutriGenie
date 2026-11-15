from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ReferralBase(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=100)
    patient_phone: str = Field(..., min_length=7, max_length=30)
    patient_category: str = Field("Pregnant Mother", max_length=50)
    ward_name: str = Field("Bwari Central", max_length=80)
    chw_name: str = Field("Fatima Bello (CHEW)", max_length=100)
    phc_name: str = Field("Bwari Model Primary Health Care", max_length=120)
    diagnosis_reason: str = Field("Maternal micronutrient deficiency / Anemia check")
    scheduled_date: str = Field("Tuesday 9:00 AM", max_length=50)
    patient_id: Optional[int] = None
    chw_id: Optional[int] = None
    facility_id: Optional[int] = None


class ReferralCreate(ReferralBase):
    pass


class ReferralResponse(ReferralBase):
    id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReferralStatusUpdate(BaseModel):
    status: str  # ATTENDED, COMPLETED, NO_SHOW, PENDING
