import uuid

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_verification_status = Column(String, nullable=False)
    # "pending"（メール送信済み・未認証）
    # "verified"（OTP 成功）
    # "expired"（期限切れ）
    # "disabled"（手動無効化）
    email = Column(String, unique=True, nullable=False)
    email_verified_at = Column(DateTime(timezone=True))
    email_verification_expires_at = Column(DateTime(timezone=True))  # 有効期限
    created_at = Column(DateTime(timezone=True), server_default=func.now())
