from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# --- マスタ用 (UserOptionAttribute) ---
class OptionAttributeBase(BaseModel):
    key: str = Field(..., description="属性のキー（例: imap_server、smtp_portなど）")
    encrypted: bool = Field(
        False, description="この項目が暗号化されているかどうかのフラグ"
    )


class OptionAttributeCreate(OptionAttributeBase):
    pass


class OptionAttributeUpdate(OptionAttributeBase):
    pass


class OptionAttributeOut(OptionAttributeBase):

    id: UUID = Field(..., description="属性のユニークID")


# --- データ用 (UserOption) ---
class UserOptionInner(BaseModel):

    key: str = Field(..., description="設定項目のキー（OptionAttributeと対応）")
    value: str = Field(..., description="設定項目の値（文字列として保持）")


class UserOptionBulkUpdate(BaseModel):
    # リストで受け取ることで Bulk Update を実現

    options: list[UserOptionInner] = Field(
        ..., description="一括更新するオプションのリスト"
    )


class UserOptionOut(BaseModel):
    key: str = Field(..., description="設定項目のキー")
    value: str = Field(..., description="設定項目の値")
