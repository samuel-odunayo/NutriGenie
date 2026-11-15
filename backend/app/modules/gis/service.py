import math
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.gis.models import HealthFacility, WardVulnerability
from app.modules.gis.schemas import FacilityResponse, TurnByTurnRouteResponse, RouteStep

INITIAL_FACILITIES = [
    {
        "name": "Bwari Model Primary Health Care",
        "facility_type": "PHC",
        "ward_name": "Bwari Central",
        "state": "FCT",
        "latitude": 9.2810,
        "longitude": 7.3780,
        "contact_phone": "+234 803 111 2233",
        "operating_hours": "24/7 (Nutrition Unit)",
        "has_nutrition_clinic": True,
        "has_ussd_dispatch": True
    },
    {
        "name": "Kuje Comprehensive Rural Clinic",
        "facility_type": "PHC",
        "ward_name": "Kuje Ward",
        "state": "FCT",
        "latitude": 8.8920,
        "longitude": 7.2280,
        "contact_phone": "+234 802 444 5566",
        "operating_hours": "8am - 6pm (Mon-Sat)",
        "has_nutrition_clinic": True,
        "has_ussd_dispatch": True
    },
    {
        "name": "CHW Base Post - Fatima Bello (CHEW)",
        "facility_type": "CHW",
        "ward_name": "Bwari Central",
        "state": "FCT",
        "latitude": 9.2750,
        "longitude": 7.3820,
        "contact_phone": "+234 814 777 8899",
        "operating_hours": "Home Visits & Emergencies",
        "has_nutrition_clinic": True,
        "has_ussd_dispatch": True
    },
    {
        "name": "Dutse Alhaji Community Agro-Market",
        "facility_type": "AgroMarket",
        "ward_name": "Dutse Ward",
        "state": "FCT",
        "latitude": 9.1550,
        "longitude": 7.3910,
        "contact_phone": "+234 805 222 3344",
        "operating_hours": "Daily 6am - 6pm",
        "has_nutrition_clinic": False,
        "has_ussd_dispatch": False
    }
]

INITIAL_WARDS = [
    {
        "ward_name": "Bwari Central",
        "lga": "Bwari",
        "state": "FCT",
        "population": 34200,
        "iron_deficiency_pct": 36.2,
        "vitamin_a_deficiency_pct": 28.5,
        "stunting_risk_level": "Moderate",
        "active_chw_count": 8
    },
    {
        "ward_name": "Kuje Ward",
        "lga": "Kuje",
        "state": "FCT",
        "population": 29800,
        "iron_deficiency_pct": 42.1,
        "vitamin_a_deficiency_pct": 33.4,
        "stunting_risk_level": "High",
        "active_chw_count": 5
    },
    {
        "ward_name": "Dutse Ward",
        "lga": "Bwari",
        "state": "FCT",
        "population": 41500,
        "iron_deficiency_pct": 31.0,
        "vitamin_a_deficiency_pct": 24.2,
        "stunting_risk_level": "Low",
        "active_chw_count": 9
    }
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


class GisService:
    @staticmethod
    async def seed_data_if_empty(db: AsyncSession):
        res_fac = await db.execute(select(HealthFacility))
        if not res_fac.scalars().first():
            for f in INITIAL_FACILITIES:
                db.add(HealthFacility(**f))
            for w in INITIAL_WARDS:
                db.add(WardVulnerability(**w))
            await db.commit()

    @staticmethod
    async def get_facilities(db: AsyncSession, facility_type: Optional[str] = None) -> List[HealthFacility]:
        stmt = select(HealthFacility)
        if facility_type:
            stmt = stmt.where(HealthFacility.facility_type == facility_type)
        res = await db.execute(stmt)
        facilities = list(res.scalars().all())
        if not facilities:
            await GisService.seed_data_if_empty(db)
            res = await db.execute(stmt)
            facilities = list(res.scalars().all())
        return facilities

    @staticmethod
    async def get_nearby(db: AsyncSession, user_lat: float, user_lon: float) -> List[FacilityResponse]:
        facilities = await GisService.get_facilities(db)
        results = []
        for f in facilities:
            dist = haversine_km(user_lat, user_lon, f.latitude, f.longitude)
            resp = FacilityResponse.model_validate(f)
            resp.distance_km = dist
            results.append(resp)
        results.sort(key=lambda x: x.distance_km if x.distance_km is not None else 999)
        return results

    @staticmethod
    async def get_ward_heatmaps(db: AsyncSession) -> List[WardVulnerability]:
        res = await db.execute(select(WardVulnerability))
        wards = list(res.scalars().all())
        if not wards:
            await GisService.seed_data_if_empty(db)
            res = await db.execute(select(WardVulnerability))
            wards = list(res.scalars().all())
        return wards

    @staticmethod
    def get_sample_route(origin_name: str, dest_name: str) -> TurnByTurnRouteResponse:
        steps = [
            RouteStep(instruction=f"Depart from {origin_name} toward Main Community Road", distance_m=350),
            RouteStep(instruction="Turn toward local healthcare access corridor", distance_m=800),
            RouteStep(instruction="Follow marked road signs toward primary clinic entrance", distance_m=650),
            RouteStep(instruction=f"Arrive at {dest_name} (Entrance on the right)", distance_m=50),
        ]
        total_m = sum(s.distance_m for s in steps)
        dist_km = round(total_m / 1000.0, 2)
        walk_mins = int((total_m / 1000.0) / 4.5 * 60)  # average 4.5 km/h walk

        return TurnByTurnRouteResponse(
            origin=origin_name,
            destination=dest_name,
            total_distance_km=dist_km,
            estimated_walk_mins=max(5, walk_mins),
            steps=steps
        )
