from pydantic import BaseModel, ConfigDict, Field


class CartItemAdd(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=99)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, le=99)


class CartItemPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    product_name: str
    product_alias: str
    product_price: float
    product_image: str | None = None


class CartPublic(BaseModel):
    items: list[CartItemPublic]
    total_quantity: int
    total_price: float


class CartSyncItem(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=99)


class CartSync(BaseModel):
    items: list[CartSyncItem]