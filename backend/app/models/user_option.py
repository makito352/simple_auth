"""
ユーザーの設定オプションを管理するモデル定義。
このモジュールでは、ユーザー固有の各種設定項目とその値をデータベースにマッピングします。
"""

import uuid

from app.db.session import Base
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class UserOptionAttribute(Base):
    """
    ユーザーのオプション属性（定義）を管理するテーブルに対応します。
    各設定項目が暗号化される必要があるかなどのメタデータを保持します。
    """

    __tablename__ = "user_option_attributes"

    # 主キー (UUID型)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # 属性の識別キー（例: "imap_server"）
    key = Column(String, nullable=False)
    # この値が暗号化されているかどうかのフラグ
    encrypted = Column(Boolean, nullable=False, default=False)
    # レコードの作成日時
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserOption(Base):
    """
    ユーザーの具体的なオプション設定値を管理するテーブルに対応します。
    特定のユーザーに対する、個別の設定内容を保存します。
    """

    __tablename__ = "user_option"

    # 主キー (UUID型)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # 関連するユーザーのID（外部キー）
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # 設定項目の識別キー（例: "imap_server"）
    key = Column(String, nullable=False)
    # 暗号化されていない場合のプレーンテキスト値
    value = Column(String)
    # encrypted=True の場合に格納される暗号化済みデータ（JSON形式）
    encrypted_value = Column(JSON)
    # レコードの作成日時
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        # 同じユーザーに対して同じキーの値を重複して登録できないようにする制約
        UniqueConstraint("user_id", "key"),
    )
