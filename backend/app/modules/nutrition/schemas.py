from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DishBase(BaseModel):
    name: str
    category: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    iron_mg: float = 0.0
    vitamin_a_ug: float = 0.0
    cooking_time_mins: int = 25
    image_url: Optional[str] = None
    ingredients: Optional[str] = None
    staple_crops: Optional[str] = None


class DishCreate(DishBase):
    pass


class DishResponse(DishBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class MacroSummary(BaseModel):
    total_calories: int
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_iron_mg: float
    total_vitamin_a_ug: float
    
    # Dynamic clinical cohort targets
    cohort_label: str = "Standard Adult"
    target_calories: int = 2000
    target_protein_g: float = 60.0
    target_iron_mg: float = 12.0
    target_vitamin_a_ug: float = 500.0
    
    iron_target_met: bool
    vitamin_a_target_met: bool


class DailyPlanResponse(BaseModel):
    date: str
    cohort: str = "Standard Adult"
    breakfast: DishResponse
    lunch: DishResponse
    dinner: DishResponse
    summary: MacroSummary


class IntakeLogCreate(BaseModel):
    dish_id: int
    log_date: str  # YYYY-MM-DD
    meal_type: Optional[str] = "Meal"


class IntakeLogResponse(BaseModel):
    id: int
    user_id: int
    dish_id: int
    log_date: str
    meal_type: str
    created_at: datetime
    dish: Optional[DishResponse] = None

    model_config = ConfigDict(from_attributes=True)
