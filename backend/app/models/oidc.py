import uuid
from enum import Enum

from app.db.session import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class OidcAuthCode(Base):
    __tablename__ = "oidc_auth_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(255), unique=True, index=True, nullable=False)
    client_id = Column(String(255), nullable=False)
    redirect_uri = Column(String(1024), nullable=False)
    scope = Column(String(1024), nullable=False)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OidcAccessToken(Base):
    __tablename__ = "oidc_access_tokens"

    token = Column(String, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    expires_at = Column(DateTime(timezone=True), server_default=func.now())


class ValueSourceType(Enum):
    """
    OidcClaimMappingのvalue_sourceの定義

    STATIC: システム側で固定定義されている値\n
    USER_ATTRIBUTE: ユーザー固有の属性（UserOption等）から動的に取得する値\n
    USER_FIELD: ユーザーの基本プロファイル項目などから取得する値\n
    """

    # システム側で固定定義されている値
    STATIC = "static"  # システム側で固定定義されている値

    # ユーザー固有の属性（UserOption等）から動的に取得する値
    USER_ATTRIBUTE = "user_attribute"

    # ユーザーの基本プロファイル項目などから取得する値(取得元はusersテーブル)
    USERPROFILE = "user_profile"


class OidcClaimMapping(Base):
    __tablename__ = "oidc_claim_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    scope = Column(String(255), nullable=False)  # 例: "imap"
    claim_name = Column(String(255), nullable=False)  # 例: "imap_server"
    value_source = Column(
        String(64), nullable=False
    )  # "user_attribute" / "static" / "user_profile"
    value_key = Column(String(255))  # user_attribute の key など
    static_value = Column(String(1024))  # value_source=static の場合
    created_at = Column(DateTime(timezone=True), server_default=func.now())
