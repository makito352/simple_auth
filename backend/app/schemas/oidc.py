from typing import Optional
from uuid import UUID

from app.models.oidc import ValueSourceType
from pydantic import BaseModel, Field


class ClaimMappingBase(BaseModel):
    """共通のフィールドを定義するベースモデル"""

    scope: str = Field(..., description="スコープ（例: openid, profileなど）")
    claim_name: str = Field(..., description="クレーム名（例: sub, emailなど）")
    value_source: ValueSourceType = Field(
        ...,
        description="値の取得元（ValueSourceType の値: static / user_attribute / user_profile）",
    )
    value_key: Optional[str] = Field(None, description="動的に値を抽出するためのキー")
    static_value: Optional[str] = Field(None, description="固定値として設定する文字列")


class ClaimMappingCreate(ClaimMappingBase):
    """新規作成および更新用のリクエストモデル"""

    pass


class ClaimMappingResponse(ClaimMappingBase):
    """詳細表示およびレスポンス用のモデル"""

    id: UUID = Field(..., description="識別子（UUID）")
