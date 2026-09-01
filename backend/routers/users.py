from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.models import User
from backend.schemas.schemas import UserCreate, UserOut

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.post("/", response_model=UserOut)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Idempotent user create (auth required). Use /auth/register for new signups
    — this endpoint exists for back-compat with admin-style flows and now requires
    authentication to prevent anonymous account pre-creation."""
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        return existing
    new_user = User(email=user.email, name=user.name)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user (replaces the old unauthenticated GET /users/{id}
    to prevent user enumeration / PII leakage)."""
    return current_user