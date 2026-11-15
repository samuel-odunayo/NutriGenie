from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)  # Breakfast, Lunch, Dinner, Snack
    calories = Column(Integer, default=0)
    protein_g = Column(Float, default=0.0)
    carbs_g = Column(Float, default=0.0)
    fat_g = Column(Float, default=0.0)
    iron_mg = Column(Float, default=0.0)
    vitamin_a_ug = Column(Float, default=0.0)
    cooking_time_mins = Column(Integer, default=20)
    image_url = Column(String(255), nullable=True)
    ingredients = Column(Text, nullable=True)  # Comma-separated or description
    staple_crops = Column(String(150), nullable=True)  # E.g. "Beans, Yam, Palm Oil"


class DailyIntakeLog(Base):
    __tablename__ = "daily_intake_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False)
    log_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    meal_type = Column(String(30), default="Meal")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
