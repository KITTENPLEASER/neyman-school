from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, log_action
from app.crud import feedback as crud_feedback
from app.crud import user as crud_user
from app.database import get_db
from app.models.action import UserAction
from app.models.user import User
from app.schemas.feedback import FeedbackPublic
from app.schemas.user import PasswordChange, UserPublic, UserUpdate


router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserPublic)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("", response_model=UserPublic)
def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.email and payload.email.lower() != current_user.email:
        if crud_user.get_by_email(db, payload.email):
            raise HTTPException(status_code=409, detail="Email уже занят")
        current_user.email = payload.email.lower()

    if payload.username and payload.username != current_user.username:
        if crud_user.get_by_username(db, payload.username):
            raise HTTPException(status_code=409, detail="Имя пользователя занято")
        current_user.username = payload.username

    if payload.name:
        current_user.name = payload.name
    if payload.phone is not None:
        current_user.phone = payload.phone

    db.commit()
    db.refresh(current_user)
    log_action(db, current_user.id, "profile_update", "/api/profile")
    return current_user


@router.post("/password", response_model=UserPublic)
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.core.security import verify_password

    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    crud_user.change_password(db, current_user, payload.new_password)
    log_action(db, current_user.id, "password_change", "/api/profile/password")
    db.refresh(current_user)
    return current_user


@router.get("/feedback", response_model=list[FeedbackPublic])
def my_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud_feedback.list_for_user(db, current_user.id)


@router.get("/actions")
def my_actions(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    actions = (
        db.query(UserAction)
        .filter(UserAction.user_id == current_user.id)
        .order_by(UserAction.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {"id": a.id, "action": a.action, "page": a.page, "created_at": a.created_at}
        for a in actions
    ]