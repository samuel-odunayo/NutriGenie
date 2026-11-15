from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.identity.models import User
from app.modules.identity.schemas import UserRegister, AuthTokenResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token


class IdentityService:
    ADMIN_SECRET = "nutrifit_admin_2026"

    @staticmethod
    async def register_user(db: AsyncSession, data: UserRegister) -> AuthTokenResponse:
        # Check if phone number already registered
        stmt = select(User).where(User.phone_number == data.phone_number)
        res = await db.execute(stmt)
        existing_user = res.scalars().first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered. Please sign in."
            )

        # Enforce role restriction: prevent unauthorized PHC_ADMIN or CHW self-elevation
        role = data.role.upper()
        if role in ["PHC_ADMIN", "ADMIN"]:
            if data.admin_secret != IdentityService.ADMIN_SECRET:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid administrator enrollment secret. Cannot self-assign PHC_ADMIN role."
                )
            role = "PHC_ADMIN"
        elif role not in ["CITIZEN", "CHW", "PHC_ADMIN"]:
            role = "CITIZEN"

        raw_password = data.password or "1234"
        pwd_hash = hash_password(raw_password)

        new_user = User(
            full_name=data.full_name,
            phone_number=data.phone_number,
            password_hash=pwd_hash,
            role=role,
            patient_category=data.patient_category or "General Citizen",
            ward_name=data.ward_name,
            state=data.state
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        token = create_access_token({
            "sub": str(new_user.id),
            "phone": new_user.phone_number,
            "role": new_user.role
        })

        return AuthTokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(new_user)
        )

    @staticmethod
    async def authenticate_user(db: AsyncSession, phone: str, password: Optional[str] = None) -> AuthTokenResponse:
        stmt = select(User).where(User.phone_number == phone)
        res = await db.execute(stmt)
        user = res.scalars().first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Phone number not registered. Please create an account first."
            )

        # Verify password if user has password_hash and password is provided
        if password and user.password_hash:
            if not verify_password(password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect password or PIN."
                )
        elif not user.password_hash and password:
            # Upgrade legacy account with password
            user.password_hash = hash_password(password)
            await db.commit()

        token = create_access_token({
            "sub": str(user.id),
            "phone": user.phone_number,
            "role": user.role
        })

        return AuthTokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )

    @staticmethod
    async def get_by_phone(db: AsyncSession, phone: str) -> Optional[User]:
        stmt = select(User).where(User.phone_number == phone)
        res = await db.execute(stmt)
        return res.scalars().first()

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        res = await db.execute(stmt)
        return res.scalars().first()
