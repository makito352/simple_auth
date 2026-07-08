"""
OIDC (OpenID Connect) のレスポンスモデルを定義する Pydantic モデル。
このモジュールでは、OIDC のトークンレスポンスやユーザー情報を扱います。
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TokenRequest(BaseModel):
    grant_type: str = Field(..., description="グラントタイプ（例: authorization_code）")
    code: str = Field(..., description="認可コード")
    redirect_uri: str = Field(..., description="リダイレクトURI")
    client_id: str = Field(..., description="クライアントID")
    client_secret: Optional[str] = Field(
        None, description="クライアント秘密鍵（必要に応じて）"
    )


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="アクセストークン")
    token_type: str = Field("Bearer", description="トークンタイプ")
    expires_in: int = Field(..., description="有効期限（秒）")
    id_token: Optional[str] = Field(None, description="IDトークン（必要に応じて）")


class UserInfoResponse(BaseModel):
    sub: str = Field(..., description="ユーザー識別子")
    email: str = Field(..., description="メールアドレス")
    email_verified: bool = Field(..., description="メールアドレスの検証状態")
    name: str = Field(..., description="ユーザー名")
    preferred_username: str = Field(..., description="優先ユーザー名")
    # 動的なクレームを許容する設定 (Pydantic v2 形式)
    model_config = ConfigDict(extra="allow")


class OpenIdConfigurationResponse(BaseModel):
    """OpenID Provider Metadata のレスポンスモデル。"""

    issuer: str = Field(..., description="Issuer Identifier")
    authorization_endpoint: str = Field(..., description="認可エンドポイント")
    token_endpoint: str = Field(..., description="トークンエンドポイント")
    userinfo_endpoint: str = Field(..., description="UserInfoエンドポイント")
    jwks_uri: str = Field(..., description="JWKSエンドポイント")
    response_types_supported: list[str] = Field(
        ..., description="サポートするresponse_type一覧"
    )
    subject_types_supported: list[str] = Field(
        ..., description="サポートするsubject_type一覧"
    )
    id_token_signing_alg_values_supported: list[str] = Field(
        ..., description="サポートするIDトークン署名アルゴリズム一覧"
    )
    scopes_supported: list[str] = Field(..., description="サポートするスコープ一覧")
    token_endpoint_auth_methods_supported: list[str] = Field(
        ..., description="サポートするトークンエンドポイント認証方式一覧"
    )


class JwkKey(BaseModel):
    """JWKS の単一キーを表現するモデル。"""

    kty: str = Field(..., description="鍵種別")
    n: str = Field(..., description="RSA公開鍵のmodulus")
    e: str = Field(..., description="RSA公開鍵のexponent")
    kid: Optional[str] = Field(None, description="キーID")
    use: Optional[str] = Field(None, description="キー用途")
    alg: Optional[str] = Field(None, description="アルゴリズム")
    # jwcrypto の出力互換のため、追加フィールドを許容する
    model_config = ConfigDict(extra="allow")


class JwksResponse(BaseModel):
    """JWKS エンドポイントのレスポンスモデル。"""

    keys: list[JwkKey] = Field(..., description="公開鍵一覧")
