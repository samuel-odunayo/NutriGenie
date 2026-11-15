from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.gis.schemas import FacilityResponse, WardVulnerabilityResponse, TurnByTurnRouteResponse
from app.modules.gis.service import GisService

router = APIRouter(prefix="/gis", tags=["Geospatial & Facility Access"])


@router.get("/facilities", response_model=List[FacilityResponse])
async def list_facilities(
    facility_type: Optional[str] = Query(None, description="Filter by PHC, CHW, or AgroMarket"),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all mapped primary healthcare facilities, CHWs, and agro-markets."""
    return await GisService.get_facilities(db, facility_type=facility_type)


@router.get("/nearby", response_model=List[FacilityResponse])
async def find_nearby(
    lat: float = Query(9.2800, description="User current latitude (e.g. Bwari)"),
    lon: float = Query(7.3800, description="User current longitude"),
    db: AsyncSession = Depends(get_db)
):
    """Find facilities ranked by geographic proximity with distance in km."""
    return await GisService.get_nearby(db, user_lat=lat, user_lon=lon)


@router.get("/ward-heatmaps", response_model=List[WardVulnerabilityResponse])
async def get_ward_heatmaps(db: AsyncSession = Depends(get_db)):
    """Retrieve ward-level micronutrient vulnerability (Iron, Vitamin A) and CHW coverage."""
    return await GisService.get_ward_heatmaps(db)


@router.get("/route", response_model=TurnByTurnRouteResponse)
async def get_route(
    origin: str = "My Location",
    destination: str = "Bwari Model Primary Health Care"
):
    """Generate turn-by-turn walking navigation for offline rural health routes."""
    return GisService.get_sample_route(origin_name=origin, dest_name=destination)
