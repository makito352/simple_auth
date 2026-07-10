"""
one time link（ワンタイムURL）関連のスキーマを定義するモジュール。
このモジュールでは、ワンタイムリンクの作成、取得、検証のデータ構造を定義します。
"""

from uuid import UUID
from typing import Literal

from pydantic import BaseModel, Field


# --- Request Models ---
class CreateLinkRequest(BaseModel):
    """新規トークン生成リクエスト用モデル"""

    user_id: UUID = Field(description="ユーザーのユニークID")


class GetLinkRequest(BaseModel):
    """既存ワンタイムリンク取得（GET）用リクエストモデル"""

    user_id: UUID = Field(description="ユーザーのユニークID")
    link_type: Literal["registration", "device_registration"] = Field(
        default="registration",
        description="取得対象のリンク種別（registration/device_registration）",
    )


# --- Response Models ---
class OneTimeLinkCreateResponse(BaseModel):
    """
    トークン作成成功時のレスポンス。
    管理画面から呼び出す際に、発行されたトークンと有効期限を返します。
    """

    token: str = Field(description="生成された一回限りのアクセストークン")
    url: str = Field(description="ユーザーに送付する用のフルURL")
    expires_at: str = Field(description="トークンの有効期限（ISO 8601形式）")
    message: str = Field(description="処理結果に関するメッセージ")


class OneTimeLinkGetResponse(OneTimeLinkCreateResponse):
    """既存ワンタイムリンク取得（GET）用レスポンスモデル"""

    link_type: Literal["registration", "device_registration"] = Field(
        description="取得したリンクの種別（registration/device_registration）"
    )


class TokenVerificationResponse(BaseModel):
    """
    トークン検証成功時のレスポンス。
    フロントエンドがURLから受け取ったトークンを検証し、
    そのユーザーが誰であるかを識別する際に使用します。
    """

    user_id: str = Field(description="検証されたユーザーのID")
    email: str = Field(description="検証されたユーザーのメールアドレス")
    status: str = Field(description="ユーザーの状態（例: success:認証済み, pending:登録中）")
