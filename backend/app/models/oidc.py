import uuid
from enum import Enum

from app.db.session import Base
from sqlalchemy import ARRAY, Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class OidcAuthCode(Base):
    """OIDC認証コード（Authorization Code）を保持するモデル。"""

    __tablename__ = "oidc_auth_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    code = Column(String(255), unique=True, index=True, nullable=False)  # 認証コード
    client_id = Column(String(255), nullable=False)
    redirect_uri = Column(String(1024), nullable=False)
    scope = Column(String(1024), nullable=False)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OidcAccessToken(Base):
    """OIDCアクセストークンを保持するモデル。"""

    __tablename__ = "oidc_access_tokens"

    token = Column(String, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    expires_at = Column(DateTime(timezone=True), server_default=func.now())


class ValueSourceType(Enum):
    """
    OidcClaimMappingのvalue_source（値の取得元）の定義。

    STATIC: システム側で固定定義されている値
    USER_ATTRIBUTE: ユーザー固有の属性（UserOption等）から動的に取得する値
    USER_PROFILE: ユーザーの基本プロファイル項目などから取得する値（usersテーブルを参照）
    """

    # システム側で固定定義されている値
    STATIC = "static"  # システム側で固定定義されている値

    # ユーザー固有の属性（UserOption等）から動的に取得する値
    USER_ATTRIBUTE = "user_attribute"

    # ユーザーの基本プロファイル項目などから取得する値(取得元はusersテーブル)
    USERPROFILE = "user_profile"


class OidcClaimMapping(Base):
    """OIDCクレーム（属性）と内部データのマッピングを定義するモデル。"""

    __tablename__ = "oidc_claim_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 関連するOIDCスコープの識別子
    scope = Column(
        String(255),
        ForeignKey("oidc_scopes.scope_name", ondelete="CASCADE"),
        nullable=False,
    )  # 例: "imap"
    # クレーム名（例: "imap_server"）
    claim_name = Column(String(255), nullable=False)
    # 値の取得元定義 ("user_attribute", "static", "user_profile")
    value_source = Column(String(64), nullable=False)
    # value_source="user_attribute" の場合のキー名
    value_key = Column(String(255))
    # value_source="static" の場合に使用する固定値
    static_value = Column(String(1024))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OidcClient(Base):
    """OIDCクライアント（アプリケーション）の基本情報を保持するモデル。"""

    __tablename__ = "oidc_clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    client_id = Column(String(255), unique=True, nullable=False)
    # client_secret は暗号化して保存する
    client_secret = Column(String(2048), nullable=False)
    description = Column(String(1024), nullable=True)
    allowed_redirect_uris = Column(ARRAY(String), nullable=False, default=list)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class OidcScope(Base):
    """定義済みOIDCスコープ（権限範囲）を保持するモデル。"""

    __tablename__ = "oidc_scopes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope_name = Column(String(255), unique=True, nullable=False)
    description = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OidcClientScope(Base):
    """OIDCクライアントと許可されたスコープの紐付けを保持する多対多の中間モデル。"""

    __tablename__ = "oidc_client_scopes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(
        String(255),
        ForeignKey("oidc_clients.client_id", ondelete="CASCADE"),
        nullable=False,
    )
    scope_name = Column(
        String(255),
        ForeignKey("oidc_scopes.scope_name", ondelete="CASCADE"),
        nullable=False,
    )
