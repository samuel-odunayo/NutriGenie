from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.identity.models import User
from app.modules.identity.schemas import UserRegister, AuthTokenResponse, UserLogin, UserResponse
from app.modules.identity.service import IdentityService
from app.modules.identity.dependencies import get_current_user

router = APIRouter(prefix="/identity", tags=["Identity & Access Control"])


@router.post("/register", response_model=AuthTokenResponse)
async def register_user(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new citizen, community health worker, or clinic admin with JWT credentials."""
    return await IdentityService.register_user(db, data)


@router.post("/login", response_model=AuthTokenResponse)
async def login_user(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate field health workers and community members, returning a signed JWT token."""
    return await IdentityService.authenticate_user(db, phone=data.phone_number, password=data.password)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve the currently authenticated user profile from verified JWT bearer token."""
    return current_user
