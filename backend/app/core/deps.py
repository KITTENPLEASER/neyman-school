from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import decode_token
from app.database import get_db
from app.models.action import UserAction
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_PREFIX}/auth/login/form",
    auto_error=False,
)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не авторизован",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exc

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exc

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exc

    user = db.get(User, int(user_id))
    if not user:
        raise credentials_exc
    return user


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """То же, что get_current_user, но не падает, если юзер не залогинен."""
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.get(User, int(user_id))


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Доступ только для администратора")
    return current_user


def log_action(db: Session, user_id: int | None, action: str, page: str | None = None) -> None:
    """Записать действие в журнал user_actions."""
    try:
        db.add(UserAction(user_id=user_id, action=action, page=page))
        db.commit()
    except Exception:
        db.rollback()


def client_meta(request: Request) -> tuple[str | None, str | None]:
    """IP и User-Agent для сессии."""
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    return ip, ua