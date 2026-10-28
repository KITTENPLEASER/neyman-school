from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CategoryPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    alias: str


class ProductPropertyPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    property_name: str
    property_value: str
    property_price: Decimal | None = None


class ProductImagePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image: str
    title: str | None = None


class ProductShort(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    alias: str
    short_description: str | None = None
    price: Decimal
    image: str | None = None
    available: bool
    category_id: int | None = None


class ProductFull(ProductShort):
    description: str | None = None
    meta_keywords: str | None = None
    meta_description: str | None = None
    meta_title: str | None = None
    properties: list[ProductPropertyPublic] = []
    images: list[ProductImagePublic] = []
    category: CategoryPublic | None = None