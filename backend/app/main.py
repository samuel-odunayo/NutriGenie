from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal

# Import domain models to ensure all tables are registered with Base.metadata
import app.modules.identity.models
import app.modules.nutrition.models
import app.modules.gis.models
import app.modules.referrals.models
import app.modules.telecom.models

# Import domain module routers and services
from app.modules.identity.router import router as identity_router
from app.modules.nutrition.router import router as nutrition_router
from app.modules.nutrition.service import NutritionService
from app.modules.gis.router import router as gis_router
from app.modules.gis.service import GisService
from app.modules.referrals.router import router as referrals_router
from app.modules.telecom.router import router as telecom_router


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await NutritionService.seed_dishes_if_empty(session)
        await GisService.seed_data_if_empty(session)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    await init_db()
    print("NutriGenie Modular Monolith initialized successfully with verified schemas.")
    yield
    print("Shutting down NutriGenie backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hardened Modular Monolith Backend for NutriGenie: Nutrition, Geospatial Health, Care Continuity & USSD Gateway.",
    lifespan=lifespan
)

# Secure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all 5 domain modules
app.include_router(identity_router, prefix=settings.API_V1_STR)
app.include_router(nutrition_router, prefix=settings.API_V1_STR)
app.include_router(gis_router, prefix=settings.API_V1_STR)
app.include_router(referrals_router, prefix=settings.API_V1_STR)
app.include_router(telecom_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "architecture": "Hardened Modular Monolith",
        "security": "JWT Bearer with Role-Based Access Control (RBAC)",
        "modules": [
            "identity (Auth & Roles)",
            "nutrition (Indigenous Recipes, Cohort Targets & Cloud Intake Logs)",
            "gis (PHCs, Agro-Markets & Ward Heatmaps)",
            "referrals (Care Continuity & CHW Patient Tracking)",
            "telecom (USSD *347*88# State Machine & Automated SMS Dispatch)"
        ]
    }
