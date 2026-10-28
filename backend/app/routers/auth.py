from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import client_meta, get_current_user, log_action
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.crud import user as crud_user
from app.database import get_db
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
)
from app.schemas.user import UserPublic


router = APIRouter(prefix="/auth", tags=["auth"])


def _make_token_pair(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    # уникальность email и username
    if crud_user.get_by_email(db, payload.email):
        raise HTTPException(status_code=409, detail="Email уже зарегистрирован")
    if crud_user.get_by_username(db, payload.username):
        raise HTTPException(status_code=409, detail="Имя пользователя уже занято")

    user = crud_user.create_user(
        db,
        name=payload.name,
        username=payload.username,
        email=payload.email,
        phone=payload.phone,
        password=payload.password,
    )
    crud_user.touch_last_login(db, user)

    # сохраняем refresh-токен в user_sessions
    ip, ua = client_meta(request)
    tokens = _make_token_pair(user)
    _store_session(db, user.id, tokens.refresh_token, ip, ua)

    log_action(db, user.id, "register", "/api/auth/register")
    return tokens


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = crud_user.authenticate(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    crud_user.touch_last_login(db, user)

    ip, ua = client_meta(request)
    tokens = _make_token_pair(user)
    _store_session(db, user.id, tokens.refresh_token, ip, ua)

    log_action(db, user.id, "login", "/api/auth/login")
    return tokens


# Опционально: OAuth2-форма для кнопки Authorize в /docs
@router.post("/login/form", response_model=TokenPair, include_in_schema=False)
def login_form(
    form: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db),
):
    # username здесь = email
    user = crud_user.authenticate(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    crud_user.touch_last_login(db, user)
    tokens = _make_token_pair(user)
    ip, ua = client_meta(request) if request else (None, None)
    _store_session(db, user.id, tokens.refresh_token, ip, ua)
    log_action(db, user.id, "login", "/api/auth/login/form")
    return tokens


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Невалидный refresh-токен")

    user_id = int(data["sub"])
    user = crud_user.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")

    # проверяем, что сессия не отозвана
    session = (
        db.query(UserSession)
        .filter(
            UserSession.session_token == payload.refresh_token,
            UserSession.revoked.is_(False),
        )
        .first()
    )
    if not session or session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Сессия недействительна")

    # ротация refresh-токена
    session.revoked = True
    db.commit()

    tokens = _make_token_pair(user)
    ip, ua = client_meta(request)
    _store_session(db, user.id, tokens.refresh_token, ip, ua)
    return tokens


@router.post("/logout", response_model=MessageResponse)
def logout(
    payload: RefreshRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(UserSession)
        .filter(
            UserSession.session_token == payload.refresh_token,
            UserSession.user_id == current_user.id,
        )
        .first()
    )
    if session:
        session.revoked = True
        db.commit()
    log_action(db, current_user.id, "logout", "/api/auth/logout")
    return MessageResponse(message="Вы вышли из системы")


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ---------- helpers ----------

def _store_session(
    db: Session,
    user_id: int,
    refresh_token: str,
    ip: str | None,
    ua: str | None,
) -> None:
    expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db.add(
        UserSession(
            user_id=user_id,
            session_token=refresh_token,
            ip_address=ip,
            user_agent=ua,
            expires_at=expires,
        )
    )
    db.commit()