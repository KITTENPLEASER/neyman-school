from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models._types import BigIntPK


class Product(Base):
    """Курс школы (семантически — товар/услуга по методичке)."""
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True)
    category_id: Mapped[int | None] = mapped_column(
        BigIntPK, ForeignKey("categories.id", ondelete="SET NULL")
    )
    manufacturer_id: Mapped[int | None] = mapped_column(BigIntPK)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    alias: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    short_description: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    image: Mapped[str | None] = mapped_column(String(512))
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    meta_keywords: Mapped[str | None] = mapped_column(String(500))
    meta_description: Mapped[str | None] = mapped_column(String(500))
    meta_title: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    category = relationship("Category", back_populates="products")
    properties = relationship(
        "ProductProperty", back_populates="product", cascade="all, delete-orphan"
    )
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="product", cascade="all, delete-orphan")