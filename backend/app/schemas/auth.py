"""
認証関連のスキーマを定義するモジュール。
このモジュールでは、認証リクエストやレスポンスのデータ構造を定義します。
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class StartAuthRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="認証を開始するユーザーのメールアドレス",
    )


class VerifyOTPRequest(BaseModel):
    code: str = Field(
        ...,
        description="ユーザーが入力したOTPコード（例: 123456）",
    )


class LoginOptionsRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="ログインするユーザーのメールアドレス",
    )


class CredentialCommentUpdateRequest(BaseModel):
    """
    資格情報のコメント更新リクエスト。
    """

    comment: str | None = Field(
        default=None,
        max_length=255,
        description="ユーザーが設定する資格情報コメント",
    )


class CredentialOut(BaseModel):
    """
    資格情報一覧レスポンス。
    """

    id: UUID = Field(..., description="資格情報レコードの識別子")
    credential_id: str = Field(..., description="WebAuthn資格情報ID")
    device_name: str | None = Field(default=None, description="クライアントOS名")
    user_comment: str | None = Field(default=None, description="ユーザーコメント")
    created_at: datetime = Field(..., description="登録日時")

    class Config:
        from_attributes = True
