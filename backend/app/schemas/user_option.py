"""
ユーザーオプション関連のスキーマを定義するモジュール。
このモジュールでは、ユーザーオプションの作成、取得、更新のデータ構造を定義します。
"""

from uuid import UUID

from pydantic import BaseModel, Field


# --- マスタ用 (UserOptionAttribute) ---
class OptionAttributeBase(BaseModel):
    """
    ユーザーオプション属性の共通ベースモデル。
    """

    key: str = Field(..., description="属性のキー（例: imap_server、smtp_portなど）")
    encrypted: bool = Field(
        False, description="この項目が暗号化されているかどうかのフラグ"
    )


class OptionAttributeCreate(OptionAttributeBase):
    """
    ユーザーオプション属性作成リクエストモデル。
    """

    pass


class OptionAttributeUpdate(OptionAttributeBase):
    """
    ユーザーオプション属性更新リクエストモデル。
    """

    pass


class OptionAttributeOut(OptionAttributeBase):
    """
    ユーザーオプション属性取得レスポンスモデル。
    """

    id: UUID = Field(..., description="属性のユニークID")


# --- データ用 (UserOption) ---
class UserOptionInner(BaseModel):
    """
    ユーザーオプションの内部モデル。
    このモデルは、ユーザーオプションのキーと値を表します。
    """

    key: str = Field(..., description="設定項目のキー（OptionAttributeと対応）")
    value: str = Field(..., description="設定項目の値（文字列として保持）")


class UserOptionBulkUpdate(BaseModel):
    """
    ユーザーオプションの一括更新モデル。
    このモデルは、複数のユーザーオプションを一度に更新するために使用されます。
    """

    options: list[UserOptionInner] = Field(
        ..., description="一括更新するオプションのリスト"
    )


class UserOptionOut(BaseModel):
    """
    ユーザーオプション取得レスポンスモデル。
    """

    key: str = Field(..., description="設定項目のキー")
    value: str = Field(..., description="設定項目の値")
