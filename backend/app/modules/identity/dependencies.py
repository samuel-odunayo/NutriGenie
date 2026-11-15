from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_access_token
from app.modules.identity.models import User

security_scheme = HTTPBearer(auto_error=False)


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Retrieve current user from JWT token if provided, else None."""
    if not credentials or not credentials.credentials:
        return None
    
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    
    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        return None
        
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    return res.scalars().first()


async def get_current_user(
    user: Optional[User] = Depends(get_optional_current_user)
) -> User:
    """Enforce authentication: raises 401 Unauthorized if no valid user."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials are required and must be valid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(allowed_roles: List[str]):
    """Enforce role-based access control (RBAC)."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires role in {allowed_roles}, but your role is '{current_user.role}'."
            )
        return current_user
    return role_checker
