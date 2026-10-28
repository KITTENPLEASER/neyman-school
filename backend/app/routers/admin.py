from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.crud import feedback as crud_feedback
from app.database import get_db
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.schemas.admin import (
    CategoryCreate,
    CategoryUpdate,
    FeedbackStatusUpdate,
    ProductCreate,
    ProductUpdate,
    UserRoleUpdate,
)
from app.schemas.feedback import FeedbackPublic
from app.schemas.product import CategoryPublic, ProductFull, ProductShort
from app.schemas.user import UserPublic


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ---------- Categories ----------

@router.get("/categories", response_model=list[CategoryPublic])
def admin_list_categories(db: Session = Depends(get_db)):
    return list(db.scalars(select(Category).order_by(Category.id)))


@router.post("/categories", response_model=CategoryPublic, status_code=201)
def admin_create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Category).where(Category.alias == payload.alias)):
        raise HTTPException(status_code=409, detail="Alias уже занят")
    cat = Category(name=payload.name, alias=payload.alias)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/categories/{cat_id}", response_model=CategoryPublic)
def admin_update_category(cat_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)):
    cat = db.get(Category, cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    if payload.name is not None:
        cat.name = payload.name
    if payload.alias is not None:
        cat.alias = payload.alias
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{cat_id}", status_code=204)
def admin_delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.get(Category, cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    db.delete(cat)
    db.commit()


# ---------- Products ----------

@router.get("/products", response_model=list[ProductShort])
def admin_list_products(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    return list(db.scalars(select(Product).order_by(Product.id).limit(limit).offset(offset)))


@router.post("/products", response_model=ProductFull, status_code=201)
def admin_create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Product).where(Product.alias == payload.alias)):
        raise HTTPException(status_code=409, detail="Alias уже занят")
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductFull)
def admin_update_product(
    product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Курс не найден")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(product, k, v)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=204)
def admin_delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Курс не найден")
    db.delete(product)
    db.commit()


# ---------- Users ----------

@router.get("/users", response_model=list[UserPublic])
def admin_list_users(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    return list(db.scalars(select(User).order_by(User.id).limit(limit).offset(offset)))


@router.put("/users/{user_id}/role", response_model=UserPublic)
def admin_change_role(user_id: int, payload: UserRoleUpdate, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


# ---------- Feedback moderation ----------

@router.get("/feedback", response_model=list[FeedbackPublic])
def admin_list_feedback(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return crud_feedback.list_all(db, limit=limit, status=status_filter)


@router.put("/feedback/{fb_id}", response_model=FeedbackPublic)
def admin_moderate_feedback(
    fb_id: int, payload: FeedbackStatusUpdate, db: Session = Depends(get_db)
):
    fb = crud_feedback.set_status(db, fb_id, payload.status)
    if not fb:
        raise HTTPException(status_code=404, detail="Обращение не найдено")
    return fb