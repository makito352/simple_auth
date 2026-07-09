"""
資格情報（Credential）モデルの定義
ユーザーに関連付けられた公開鍵やデバイス情報を管理します。
"""
import uuid

from app.db.session import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class Credential(Base):
    """
    認証情報のエンティティ。
    ユーザーごとに紐づくデバイス情報や公開鍵を保持します。
    """
    __tablename__ = "credentials"

    # 識別子（UUID）
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # ユーザーとのリレーションシップ
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # 外部サービス等で識別するための固有ID
    credential_id = Column(String, unique=True, nullable=False)
    # 暗号化用の公開鍵
    public_key = Column(String, nullable=False)
    # 総署名回数
    sign_count = Column(Integer, default=0)
    # デバイスの識別名（例：iPhone, PCなど）
    device_name = Column(String)
    # ユーザーによる備考
    user_comment = Column(String)
    # 作成日時
    created_at = Column(DateTime(timezone=True), server_default=func.now())
