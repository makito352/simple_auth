import uuid

from app.db.session import Base
from sqlalchemy import (Boolean, Column, DateTime, ForeignKey, String,
                        UniqueConstraint)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_verification_status = Column(String, nullable=False)
    # "pending"（ワンタイムリンク生成済み。WebAuthn未登録）
    # "verified"（WebAuthn登録済み）
    # "expired"（期限切れ）
    # "disabled"（手動無効化）
    email = Column(String, unique=True, nullable=False)
    email_verified_at = Column(DateTime(timezone=True))
    email_verification_expires_at = Column(DateTime(timezone=True))  # 有効期限
    role = Column(String, default="user", nullable=False)
    # user:user権限
    # admin:admin権限
    created_at = Column(DateTime(timezone=True), server_default=func.now())
