from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class FacilityBase(BaseModel):
    name: str
    facility_type: str
    ward_name: str
    state: str = "FCT"
    latitude: float
    longitude: float
    contact_phone: Optional[str] = None
    operating_hours: str = "24/7"
    has_nutrition_clinic: bool = True
    has_ussd_dispatch: bool = True


class FacilityResponse(FacilityBase):
    id: int
    distance_km: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class WardVulnerabilityResponse(BaseModel):
    id: int
    ward_name: str
    lga: str
    state: str
    population: int
    iron_deficiency_pct: float
    vitamin_a_deficiency_pct: float
    stunting_risk_level: str
    active_chw_count: int

    model_config = ConfigDict(from_attributes=True)


class RouteStep(BaseModel):
    instruction: str
    distance_m: int


class TurnByTurnRouteResponse(BaseModel):
    origin: str
    destination: str
    total_distance_km: float
    estimated_walk_mins: int
    steps: List[RouteStep]
