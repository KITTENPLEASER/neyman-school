from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional, log_action
from app.crud import feedback as crud_feedback
from app.database import get_db
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackPublic


router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackPublic, status_code=status.HTTP_201_CREATED)
def create_feedback(
    payload: FeedbackCreate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    fb = crud_feedback.create(
        db,
        user_id=current_user.id if current_user else None,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        subject=payload.subject,
        message=payload.message,
        rating=payload.rating,
    )
    if current_user:
        log_action(db, current_user.id, "feedback_submit", "/api/feedback")
    return fb