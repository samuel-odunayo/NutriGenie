from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    phone_number: str = Field(..., min_length=7, max_length=30)
    password: Optional[str] = Field("1234", min_length=4, max_length=64, description="Password or 4-digit PIN")
    role: str = Field("CITIZEN", description="CITIZEN, CHW, or PHC_ADMIN")
    patient_category: Optional[str] = Field("General Citizen", description="Pregnant Mother, Nursing Mother, Infant, etc.")
    ward_name: Optional[str] = "Bwari Central"
    state: str = "FCT"
    admin_secret: Optional[str] = Field(None, description="Secret required to register as PHC_ADMIN")


class UserLogin(BaseModel):
    phone_number: str
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    full_name: str
    phone_number: str
    role: str
    patient_category: Optional[str] = "General Citizen"
    ward_name: Optional[str]
    state: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
