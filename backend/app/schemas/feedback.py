from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class FeedbackCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=20)
    subject: str = Field(min_length=2, max_length=120)
    message: str = Field(min_length=10, max_length=5000)
    rating: int | None = Field(default=None, ge=1, le=5)
    privacy: bool

    def model_post_init(self, __context) -> None:
        if not self.privacy:
            raise ValueError("Требуется согласие на обработку персональных данных")


class FeedbackPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    name: str
    email: EmailStr
    phone: str | None
    subject: str
    message: str
    rating: int | None
    status: str
    created_at: datetime