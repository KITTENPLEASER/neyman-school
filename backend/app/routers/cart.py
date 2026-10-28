from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud import cart as crud_cart
from app.database import get_db
from app.models.user import User
from app.schemas.cart import (
    CartItemAdd,
    CartItemPublic,
    CartItemUpdate,
    CartPublic,
    CartSync,
)


router = APIRouter(prefix="/basket", tags=["basket"])


def _serialize(items) -> CartPublic:
    pub = [
        CartItemPublic(
            id=i.id,
            product_id=i.product_id,
            quantity=i.quantity,
            product_name=i.product.name if i.product else "",
            product_alias=i.product.alias if i.product else "",
            product_price=float(i.product.price) if i.product else 0.0,
            product_image=i.product.image if i.product else None,
        )
        for i in items
    ]
    return CartPublic(
        items=pub,
        total_quantity=sum(i.quantity for i in pub),
        total_price=round(sum(i.product_price * i.quantity for i in pub), 2),
    )


@router.get("", response_model=CartPublic)
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _serialize(crud_cart.list_items(db, current_user.id))


@router.post("", response_model=CartPublic, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    payload: CartItemAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    crud_cart.add_item(db, current_user.id, payload.product_id, payload.quantity)
    return _serialize(crud_cart.list_items(db, current_user.id))


@router.put("/{item_id}", response_model=CartPublic)
def update_cart_item(
    item_id: int,
    payload: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not crud_cart.update_quantity(db, current_user.id, item_id, payload.quantity):
        raise HTTPException(status_code=404, detail="Позиция не найдена")
    return _serialize(crud_cart.list_items(db, current_user.id))


@router.delete("/{item_id}", response_model=CartPublic)
def remove_cart_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not crud_cart.remove_item(db, current_user.id, item_id):
        raise HTTPException(status_code=404, detail="Позиция не найдена")
    return _serialize(crud_cart.list_items(db, current_user.id))


@router.post("/sync", response_model=CartPublic)
def sync_cart(
    payload: CartSync,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = [(i.product_id, i.quantity) for i in payload.items]
    items = crud_cart.sync_from_local(db, current_user.id, items)
    return _serialize(items)


@router.delete("", response_model=CartPublic)
def clear_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    crud_cart.clear(db, current_user.id)
    return CartPublic(items=[], total_quantity=0, total_price=0.0)