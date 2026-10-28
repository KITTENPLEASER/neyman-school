from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.cart import CartItem
from app.models.product import Product


def list_items(db: Session, user_id: int) -> list[CartItem]:
    return list(
        db.scalars(
            select(CartItem)
            .options(selectinload(CartItem.product))
            .where(CartItem.user_id == user_id)
            .order_by(CartItem.added_at.desc())
        )
    )


def get_item(db: Session, user_id: int, product_id: int) -> CartItem | None:
    return db.scalar(
        select(CartItem).where(
            CartItem.user_id == user_id, CartItem.product_id == product_id
        )
    )


def add_item(db: Session, user_id: int, product_id: int, quantity: int) -> CartItem:
    existing = get_item(db, user_id, product_id)
    if existing:
        existing.quantity = min(existing.quantity + quantity, 99)
        db.commit()
        db.refresh(existing)
        return existing
    item = CartItem(user_id=user_id, product_id=product_id, quantity=quantity)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_quantity(db: Session, user_id: int, item_id: int, quantity: int) -> CartItem | None:
    item = db.get(CartItem, item_id)
    if not item or item.user_id != user_id:
        return None
    item.quantity = quantity
    db.commit()
    db.refresh(item)
    return item


def remove_item(db: Session, user_id: int, item_id: int) -> bool:
    item = db.get(CartItem, item_id)
    if not item or item.user_id != user_id:
        return False
    db.delete(item)
    db.commit()
    return True


def clear(db: Session, user_id: int) -> None:
    for item in list_items(db, user_id):
        db.delete(item)
    db.commit()


def sync_from_local(db: Session, user_id: int, items: list[tuple[int, int]]) -> list[CartItem]:
    """items: список (product_id, quantity) — заменяет корзину целиком,
    но суммирует количества, если товар уже был."""
    for product_id, quantity in items:
        if db.get(Product, product_id) is None:
            continue
        existing = get_item(db, user_id, product_id)
        if existing:
            existing.quantity = min(existing.quantity + quantity, 99)
        else:
            db.add(CartItem(user_id=user_id, product_id=product_id, quantity=quantity))
    db.commit()
    return list_items(db, user_id)