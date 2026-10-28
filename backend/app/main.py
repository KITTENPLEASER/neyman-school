from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.routers import actions, admin, auth, cart, feedback, health, products, profile


@asynccontextmanager
async def lifespan(app: FastAPI):

    from app.database import Base
    from app import models
    Base.metadata.create_all(bind=engine)
    print("[startup] Tables ensured")

    try:
        from app.seed import seed
        from app.database import SessionLocal
        from app.models.product import Product
        from sqlalchemy import select
        
        db = SessionLocal()
        if not db.scalars(select(Product)).first():
            print("[startup] Database is empty. Running seed...")
            seed()
        db.close()
    except Exception as e:
        print(f"[startup] Seed failed: {e}")

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(
            "[startup] DB connection OK: "
            f"{engine.url.render_as_string(hide_password=True)}"
        )
    except Exception as e:
        print(f"[startup] DB connection FAILED: {e}")
    yield
    engine.dispose()
    print("[shutdown] engine disposed")


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(profile.router, prefix=settings.API_PREFIX)
app.include_router(products.router, prefix=settings.API_PREFIX)
app.include_router(feedback.router, prefix=settings.API_PREFIX)
app.include_router(cart.router, prefix=settings.API_PREFIX)
app.include_router(actions.router, prefix=settings.API_PREFIX)
app.include_router(admin.router, prefix=settings.API_PREFIX)


@app.get("/")
def root() -> dict:
    return {
        "message": "Neyman School API",
        "docs": "/docs",
        "api_prefix": settings.API_PREFIX,
    }