from decimal import Decimal

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    alias: str = Field(min_length=2, max_length=120)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    alias: str | None = Field(default=None, min_length=2, max_length=120)


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    alias: str = Field(min_length=2, max_length=255)
    category_id: int | None = None
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    price: Decimal = Field(default=Decimal("0"), ge=0)
    image: str | None = Field(default=None, max_length=512)
    available: bool = True
    meta_keywords: str | None = None
    meta_description: str | None = None
    meta_title: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    alias: str | None = Field(default=None, min_length=2, max_length=255)
    category_id: int | None = None
    short_description: str | None = None
    description: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    image: str | None = None
    available: bool | None = None
    meta_keywords: str | None = None
    meta_description: str | None = None
    meta_title: str | None = None


class UserRoleUpdate(BaseModel):
    role: str = Field(pattern="^(user|admin)$")


class FeedbackStatusUpdate(BaseModel):
    status: str = Field(pattern="^(new|in_progress|resolved)$")