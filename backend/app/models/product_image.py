from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models._types import BigIntPK


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True)
    product_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    image: Mapped[str] = mapped_column(String(512), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255))

    product = relationship("Product", back_populates="images")