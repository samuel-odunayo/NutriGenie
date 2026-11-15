from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.identity.models import User
from app.modules.identity.dependencies import get_current_user, get_optional_current_user, require_role
from app.modules.nutrition.schemas import (
    DishResponse,
    DishCreate,
    DailyPlanResponse,
    IntakeLogCreate,
    IntakeLogResponse
)
from app.modules.nutrition.service import NutritionService

router = APIRouter(prefix="/nutrition", tags=["Nutrition & Dietetics"])


@router.get("/dishes", response_model=List[DishResponse])
async def list_dishes(db: AsyncSession = Depends(get_db)):
    """List all available Nigerian indigenous dishes with nutritional values."""
    return await NutritionService.get_all_dishes(db)


@router.post("/dishes", response_model=DishResponse)
async def create_dish(
    dish: DishCreate,
    current_user: User = Depends(require_role(["CHW", "PHC_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Add a new indigenous recipe (Authorized for CHWs and Clinic Admins)."""
    return await NutritionService.create_dish(db, dish)


@router.get("/daily-plan", response_model=DailyPlanResponse)
async def get_daily_plan(
    date: str = "Today",
    cohort: Optional[str] = Query(None, description="E.g. Pregnant Mother, Nursing Mother, Infant, Standard Adult"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a balanced Nigerian meal plan with tailored clinical targets for maternal/child health."""
    effective_cohort = cohort or (current_user.patient_category if current_user and current_user.patient_category else "Standard Adult")
    return await NutritionService.generate_daily_plan(db, date_str=date, cohort=effective_cohort)


@router.post("/intake", response_model=IntakeLogResponse)
async def log_meal_intake(
    data: IntakeLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Persist a patient's meal intake log into the cloud database."""
    return await NutritionService.log_user_intake(db, user_id=current_user.id, data=data)


@router.get("/intake", response_model=List[IntakeLogResponse])
async def get_user_intake_history(
    date: Optional[str] = Query(None, description="Filter intake log by date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve logged meals for the authenticated user."""
    return await NutritionService.get_user_intakes(db, user_id=current_user.id, date_str=date)


@router.delete("/intake/{intake_id}")
async def delete_logged_meal(
    intake_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a logged meal entry for the authenticated user."""
    success = await NutritionService.delete_user_intake(db, user_id=current_user.id, intake_id=intake_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intake log entry not found")
    return {"status": "deleted", "id": intake_id}
