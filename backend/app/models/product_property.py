from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models._types import BigIntPK


class ProductProperty(Base):
    __tablename__ = "product_properties"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True)
    product_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    property_name: Mapped[str] = mapped_column(String(120), nullable=False)
    property_value: Mapped[str] = mapped_column(String(500), nullable=False)
    property_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))

    product = relationship("Product", back_populates="properties")