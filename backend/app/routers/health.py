from fastapi import APIRouter

from app.config import settings


router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "debug": settings.DEBUG,
    }