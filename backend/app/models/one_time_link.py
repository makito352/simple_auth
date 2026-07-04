import uuid
from datetime import datetime

from app.db.session import Base
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class OneTimeLink(Base):
    """
    管理画面から発行されるワンタイムアクセスURL用のトークンを管理するモデル。
    """

    __tablename__ = "one_time_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # user_id: このリンクに関連付けられたユーザー
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # token: URLに含まれるユニークな識別子（例: "rand_string_123"）
    token = Column(String, nullable=False, unique=True)
    # type: 用途の分類（例: "registration", "password_reset"）
    type = Column(String, nullable=False)
    # expires_at: トークンの有効期限
    expires_at = Column(DateTime(timezone=True), nullable=False)
    # used_at: 使用済みになった日時（NULLなら未使用）
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return (
            f"<OneTimeLink(id={self.id}, token={self.token}, used_at={self.used_at})>"
        )
