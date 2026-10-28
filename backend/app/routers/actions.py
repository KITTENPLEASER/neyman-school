from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.action import UserAction
from app.models.user import User


router = APIRouter(prefix="/actions", tags=["actions"])


@router.get("")
def list_my_actions(
    limit: int = Query(default=20, ge=1, le=100),
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
        {
            "id": a.id,
            "action": a.action,
            "page": a.page,
            "created_at": a.created_at,
        }
        for a in actions
    ]