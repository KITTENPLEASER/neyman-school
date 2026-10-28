from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.feedback import Feedback


def create(
    db: Session,
    *,
    user_id: int | None,
    name: str,
    email: str,
    phone: str | None,
    subject: str,
    message: str,
    rating: int | None = None,
) -> Feedback:
    fb = Feedback(
        user_id=user_id,
        name=name.strip(),
        email=email.lower().strip(),
        phone=phone,
        subject=subject.strip(),
        message=message.strip(),
        rating=rating,
        status="new",
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


def list_for_user(db: Session, user_id: int, limit: int = 50) -> list[Feedback]:
    return list(
        db.scalars(
            select(Feedback)
            .where(Feedback.user_id == user_id)
            .order_by(Feedback.created_at.desc())
            .limit(limit)
        )
    )


def list_all(db: Session, limit: int = 100, status: str | None = None) -> list[Feedback]:
    stmt = select(Feedback).order_by(Feedback.created_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(Feedback.status == status)
    return list(db.scalars(stmt))


def set_status(db: Session, feedback_id: int, status: str) -> Feedback | None:
    fb = db.get(Feedback, feedback_id)
    if not fb:
        return None
    fb.status = status
    db.commit()
    db.refresh(fb)
    return fb