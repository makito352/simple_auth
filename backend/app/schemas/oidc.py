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


class OidcScopeBase(BaseModel):
    """OIDCスコープ作成・更新の共通モデル。"""

    description: Optional[str] = Field(None, description="スコープ説明")


class OidcScopeCreate(OidcScopeBase):
    """OIDCスコープ作成リクエスト。"""

    scope_name: str = Field(..., description="スコープ名")


class OidcScopeUpdate(OidcScopeBase):
    """OIDCスコープ更新リクエスト。"""

    pass


class OidcScopeResponse(BaseModel):
    """OIDCスコープ一覧のレスポンスモデル。"""

    scope_name: str = Field(..., description="スコープ名")
    description: Optional[str] = Field(None, description="スコープ説明")
    is_system_scope: bool = Field(..., description="標準スコープかどうか")
    is_deletable: bool = Field(..., description="削除可能かどうか")


class OidcClientBase(BaseModel):
    """OIDCクライアント作成・更新の共通モデル。"""

    name: str = Field(..., description="管理画面に表示するアプリ名")
    description: Optional[str] = Field(None, description="管理用の備考")
    allowed_redirect_uris: list[str] = Field(
        ..., description="許可するリダイレクトURI一覧"
    )
    scope_names: list[str] = Field(..., description="許可するスコープ一覧")
    is_active: bool = Field(True, description="クライアント有効フラグ")


class OidcClientCreate(OidcClientBase):
    """OIDCクライアント作成リクエスト。"""

    client_id: str = Field(..., description="OIDCのclient_id")


class OidcClientUpdate(OidcClientBase):
    """OIDCクライアント更新リクエスト。"""

    pass


class OidcClientResponse(BaseModel):
    """OIDCクライアント詳細レスポンス。"""

    id: UUID = Field(..., description="識別子（UUID）")
    name: str = Field(..., description="管理画面に表示するアプリ名")
    client_id: str = Field(..., description="OIDCのclient_id")
    client_secret_masked: str = Field(..., description="マスクされたclient_secret")
    description: Optional[str] = Field(None, description="管理用の備考")
    allowed_redirect_uris: list[str] = Field(
        ..., description="許可するリダイレクトURI一覧"
    )
    scope_names: list[str] = Field(..., description="許可するスコープ一覧")
    is_active: bool = Field(..., description="クライアント有効フラグ")
    created_at: Optional[str] = Field(None, description="作成日時（ISO8601）")
    updated_at: Optional[str] = Field(None, description="更新日時（ISO8601）")


class OidcClientSecretResponse(OidcClientResponse):
    """作成直後または再発行時に平文シークレットを返すレスポンス。"""

    client_secret: str = Field(..., description="平文のclient_secret（このレスポンスのみ）")


class OidcClientActivationUpdate(BaseModel):
    """OIDCクライアント有効/無効切替リクエスト。"""

    is_active: bool = Field(..., description="有効化する場合はtrue")
