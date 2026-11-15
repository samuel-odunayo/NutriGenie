from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.modules.nutrition.models import Dish, DailyIntakeLog
from app.modules.nutrition.schemas import (
    DishCreate,
    MacroSummary,
    DailyPlanResponse,
    IntakeLogCreate,
    IntakeLogResponse,
    DishResponse
)

# Seed initial Nigerian dishes matching our Figma prototype
INITIAL_DISHES = [
    {
        "name": "Boiled Yam & Scrambled Egg",
        "category": "Breakfast",
        "calories": 420,
        "protein_g": 18.5,
        "carbs_g": 62.0,
        "fat_g": 11.0,
        "iron_mg": 3.4,
        "vitamin_a_ug": 160.0,
        "cooking_time_mins": 20,
        "image_url": "/assets/bread-and-egg.png",
        "ingredients": "White yam, fresh eggs, tomatoes, habanero, vegetable oil, onions",
        "staple_crops": "Yam, Egg, Pepper"
    },
    {
        "name": "Brown Beans & Sweet Yam Porridge",
        "category": "Lunch",
        "calories": 560,
        "protein_g": 26.0,
        "carbs_g": 88.0,
        "fat_g": 9.5,
        "iron_mg": 6.8,
        "vitamin_a_ug": 320.0,
        "cooking_time_mins": 45,
        "image_url": "/assets/beans-and-yam.png",
        "ingredients": "Oloyin brown beans, diced sweet yam, red palm oil, crayfish, onions",
        "staple_crops": "Brown Beans, Yam, Red Palm Oil"
    },
    {
        "name": "Nigerian Jollof Rice with Grilled Fish",
        "category": "Dinner",
        "calories": 610,
        "protein_g": 28.0,
        "carbs_g": 94.0,
        "fat_g": 14.0,
        "iron_mg": 4.1,
        "vitamin_a_ug": 410.0,
        "cooking_time_mins": 40,
        "image_url": "/assets/jollof-rice.png",
        "ingredients": "Long grain rice, tomato paste, red bell pepper, mackerel fish, bay leaves",
        "staple_crops": "Rice, Pepper, Fish"
    },
    {
        "name": "Turmeric Vegetable Soup with Eba",
        "category": "Dinner",
        "calories": 480,
        "protein_g": 22.0,
        "carbs_g": 72.0,
        "fat_g": 10.5,
        "iron_mg": 7.5,
        "vitamin_a_ug": 580.0,
        "cooking_time_mins": 30,
        "image_url": "/assets/turmeric-soup.png",
        "ingredients": "Fresh turmeric root, pumpkin leaves (ugwu), waterleaf, cassava garri, dry fish",
        "staple_crops": "Turmeric, Ugwu Leaves, Cassava"
    }
]


def get_cohort_targets(cohort: str) -> Tuple[int, float, float, float]:
    """Return (target_cal, target_protein, target_iron, target_vitA) tailored to maternal/child health."""
    norm = cohort.lower()
    if "pregnant" in norm:
        return (2350, 72.0, 27.0, 800.0)  # High iron target for maternal anemia prevention
    elif "nursing" in norm or "lactat" in norm:
        return (2500, 75.0, 15.0, 850.0)
    elif "infant" in norm or "child" in norm:
        return (1200, 30.0, 10.0, 400.0)
    return (2000, 60.0, 12.0, 500.0)  # Standard Adult default


class NutritionService:
    @staticmethod
    async def seed_dishes_if_empty(db: AsyncSession):
        stmt = select(Dish)
        res = await db.execute(stmt)
        if not res.scalars().first():
            for d in INITIAL_DISHES:
                db.add(Dish(**d))
            await db.commit()

    @staticmethod
    async def get_all_dishes(db: AsyncSession) -> List[Dish]:
        stmt = select(Dish)
        res = await db.execute(stmt)
        dishes = list(res.scalars().all())
        if not dishes:
            await NutritionService.seed_dishes_if_empty(db)
            res = await db.execute(select(Dish))
            dishes = list(res.scalars().all())
        return dishes

    @staticmethod
    async def create_dish(db: AsyncSession, dish_in: DishCreate) -> Dish:
        dish = Dish(**dish_in.model_dump())
        db.add(dish)
        await db.commit()
        await db.refresh(dish)
        return dish

    @staticmethod
    async def generate_daily_plan(
        db: AsyncSession,
        date_str: str = "Today",
        cohort: str = "Standard Adult"
    ) -> DailyPlanResponse:
        dishes = await NutritionService.get_all_dishes(db)
        if not dishes:
            raise ValueError("No dishes found to build a meal plan.")

        # Safe selection avoiding IndexError
        breakfast = next((d for d in dishes if d.category == "Breakfast"), dishes[0])
        lunch = next((d for d in dishes if d.category == "Lunch"), dishes[min(1, len(dishes) - 1)])
        dinner = next((d for d in dishes if d.category == "Dinner"), dishes[min(2, len(dishes) - 1)])

        tot_cal = breakfast.calories + lunch.calories + dinner.calories
        tot_protein = breakfast.protein_g + lunch.protein_g + dinner.protein_g
        tot_carbs = breakfast.carbs_g + lunch.carbs_g + dinner.carbs_g
        tot_fat = breakfast.fat_g + lunch.fat_g + dinner.fat_g
        tot_iron = round(breakfast.iron_mg + lunch.iron_mg + dinner.iron_mg, 1)
        tot_vit_a = round(breakfast.vitamin_a_ug + lunch.vitamin_a_ug + dinner.vitamin_a_ug, 1)

        t_cal, t_protein, t_iron, t_vit_a = get_cohort_targets(cohort)

        summary = MacroSummary(
            total_calories=tot_cal,
            total_protein_g=round(tot_protein, 1),
            total_carbs_g=round(tot_carbs, 1),
            total_fat_g=round(tot_fat, 1),
            total_iron_mg=tot_iron,
            total_vitamin_a_ug=tot_vit_a,
            cohort_label=cohort,
            target_calories=t_cal,
            target_protein_g=t_protein,
            target_iron_mg=t_iron,
            target_vitamin_a_ug=t_vit_a,
            iron_target_met=(tot_iron >= t_iron),
            vitamin_a_target_met=(tot_vit_a >= t_vit_a)
        )

        return DailyPlanResponse(
            date=date_str,
            cohort=cohort,
            breakfast=DishResponse.model_validate(breakfast),
            lunch=DishResponse.model_validate(lunch),
            dinner=DishResponse.model_validate(dinner),
            summary=summary
        )

    @staticmethod
    async def log_user_intake(
        db: AsyncSession,
        user_id: int,
        data: IntakeLogCreate
    ) -> IntakeLogResponse:
        log_entry = DailyIntakeLog(
            user_id=user_id,
            dish_id=data.dish_id,
            log_date=data.log_date,
            meal_type=data.meal_type or "Meal"
        )
        db.add(log_entry)
        await db.commit()
        await db.refresh(log_entry)

        # Fetch dish details
        dish_res = await db.execute(select(Dish).where(Dish.id == data.dish_id))
        dish = dish_res.scalars().first()

        resp = IntakeLogResponse.model_validate(log_entry)
        if dish:
            resp.dish = DishResponse.model_validate(dish)
        return resp

    @staticmethod
    async def get_user_intakes(
        db: AsyncSession,
        user_id: int,
        date_str: Optional[str] = None
    ) -> List[IntakeLogResponse]:
        stmt = select(DailyIntakeLog).where(DailyIntakeLog.user_id == user_id)
        if date_str:
            stmt = stmt.where(DailyIntakeLog.log_date == date_str)
        stmt = stmt.order_by(DailyIntakeLog.id.asc())

        res = await db.execute(stmt)
        logs = list(res.scalars().all())

        results = []
        for l in logs:
            dish_res = await db.execute(select(Dish).where(Dish.id == l.dish_id))
            dish = dish_res.scalars().first()
            item = IntakeLogResponse.model_validate(l)
            if dish:
                item.dish = DishResponse.model_validate(dish)
            results.append(item)
        return results

    @staticmethod
    async def delete_user_intake(
        db: AsyncSession,
        user_id: int,
        intake_id: int
    ) -> bool:
        stmt = delete(DailyIntakeLog).where(
            (DailyIntakeLog.id == intake_id) & (DailyIntakeLog.user_id == user_id)
        )
        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount > 0
