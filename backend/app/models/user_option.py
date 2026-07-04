import uuid

from app.db.session import Base
from sqlalchemy import (JSON, Boolean, Column, DateTime, ForeignKey, String,
                        UniqueConstraint)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class UserOptionAttribute(Base):
    """
    ユーザーのオプション属性を管理するテーブルに対応します。
    """

    __tablename__ = "user_option_attributes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # key: 属性のキー（例: "imap_server"）
    key = Column(String, nullable=False)
    # encrypted: この値が暗号化されているか (BOOLEAN)
    encrypted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserOption(Base):
    """
    ユーザーのオプション設定値を管理するテーブルに対応します。
    """

    __tablename__ = "user_option"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # user_id: どのユーザーの設定か
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    key = Column(String, nullable=False)  # 例: "imap_server"
    value = Column(String)
    encrypted_value = Column(JSON)  # encrypted=trueの場合
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "key"),  # 複合ユニーク制約をSQLで再現
    )
