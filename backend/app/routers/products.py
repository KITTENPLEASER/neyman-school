from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud import product as crud_product
from app.database import get_db
from app.schemas.product import CategoryPublic, ProductFull, ProductShort


router = APIRouter(tags=["products"])


@router.get("/categories", response_model=list[CategoryPublic])
def list_categories(db: Session = Depends(get_db)):
    return crud_product.list_categories(db)


@router.get("/products", response_model=list[ProductShort])
def list_products(
    category: str | None = Query(default=None, description="alias категории"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    return crud_product.list_products(
        db, category_alias=category, limit=limit, offset=offset
    )


@router.get("/products/{alias}", response_model=ProductFull)
def get_product(alias: str, db: Session = Depends(get_db)):
    product = crud_product.get_by_alias(db, alias)
    if not product:
        raise HTTPException(status_code=404, detail="Курс не найден")
    return product


@router.get("/search", response_model=list[ProductShort])
def search_products(
    q: str = Query(min_length=1, max_length=100),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return crud_product.search(db, q, limit=limit)