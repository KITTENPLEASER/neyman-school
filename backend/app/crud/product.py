from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.category import Category
from app.models.product import Product


def list_categories(db: Session) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.id)))


def get_category_by_alias(db: Session, alias: str) -> Category | None:
    return db.scalar(select(Category).where(Category.alias == alias))


def list_products(
    db: Session,
    *,
    category_alias: str | None = None,
    only_available: bool = True,
    limit: int = 50,
    offset: int = 0,
) -> list[Product]:
    stmt = (
        select(Product)
        .options(
            selectinload(Product.properties),
            selectinload(Product.images),
            selectinload(Product.category),
        )
        .order_by(Product.id)
        .limit(limit)
        .offset(offset)
    )
    if only_available:
        stmt = stmt.where(Product.available.is_(True))
    if category_alias:
        stmt = stmt.join(Category).where(Category.alias == category_alias)
    return list(db.scalars(stmt))


def get_by_alias(db: Session, alias: str) -> Product | None:
    return db.scalar(
        select(Product)
        .options(
            selectinload(Product.properties),
            selectinload(Product.images),
            selectinload(Product.category),
        )
        .where(Product.alias == alias)
    )


def get_by_id(db: Session, product_id: int) -> Product | None:
    return db.get(Product, product_id)


def search(db: Session, query: str, limit: int = 30) -> list[Product]:
    q = f"%{query.strip().lower()}%"
    stmt = (
        select(Product)
        .where(
            or_(
                Product.name.ilike(q),
                Product.short_description.ilike(q),
                Product.description.ilike(q),
            )
        )
        .order_by(Product.name)
        .limit(limit)
    )
    return list(db.scalars(stmt))