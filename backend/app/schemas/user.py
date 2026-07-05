"""
ユーザーに関するPydanticスキーマの定義
"""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """
    ユーザーの基本情報を定義するベースモデル
    """

    email: EmailStr = Field(..., description="ユーザーのメールアドレス")
    role: str = Field(
        default="user", description="ユーザーの権限ロール（例: admin, user）"
    )


class UserCreate(UserBase):
    """
    新規ユーザー作成時の入力用スキーマ
    """

    pass


class UserUpdate(BaseModel):
    """
    ユーザー更新時の入力用スキーマ（任意項目を許容）
    """

    email: Optional[EmailStr] = Field(None, description="更新するメールアドレス")
    role: Optional[str] = Field(None, description="更新する権限ロール")


class UserOut(BaseModel):
    """
    APIレスポンス用のユーザー情報モデル
    """

    id: UUID = Field(..., description="ユーザーの一意識別子")
    email: EmailStr = Field(..., description="ユーザーのメールアドレス")
    role: str = Field(
        ..., description="ユーザーの権限ロール(user:user権限/admin:admin権限)"
    )
    status: str = Field(
        ..., alias="email_verification_status", description="アカウントの状態"
    )

    class Config:
        from_attributes = True  # SQLAlchemyモデルをそのまま展開可能にする
