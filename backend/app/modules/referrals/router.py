from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.identity.models import User
from app.modules.identity.dependencies import get_current_user, get_optional_current_user, require_role
from app.modules.referrals.schemas import ReferralCreate, ReferralResponse, ReferralStatusUpdate
from app.modules.referrals.service import ReferralService

router = APIRouter(prefix="/referrals", tags=["Care Continuity & Patient Referrals"])


@router.post("/", response_model=ReferralResponse)
async def create_referral(
    data: ReferralCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Log a new maternal or infant health referral from a Community Health Worker or patient self-referral.
    Automatically triggers an SMS notification to the patient.
    """
    return await ReferralService.create_referral(db, data, current_user=current_user)


@router.get("/", response_model=List[ReferralResponse])
async def list_referrals(
    ward: Optional[str] = Query(None, description="Filter referrals by ward"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve clinical referrals with NDPA-compliant role filtering.
    Citizens only see their own records; CHWs and Admins see assigned ward records.
    """
    return await ReferralService.list_referrals(db, current_user=current_user, ward_name=ward)


@router.patch("/{referral_id}/status", response_model=ReferralResponse)
async def update_referral_status(
    referral_id: int,
    status_in: ReferralStatusUpdate,
    current_user: User = Depends(require_role(["CHW", "PHC_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Update referral state (ATTENDED, COMPLETED, NO_SHOW) - Restricted to CHWs & Admins."""
    updated = await ReferralService.update_status(db, referral_id, status_in, current_user=current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Referral record not found")
    return updated
