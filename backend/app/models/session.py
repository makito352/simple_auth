"""
セッション管理に関するモデル定義。
ユーザーのログインセッションをデータベースに保存するためのテーブル構造を定義します。
"""

import uuid

from app.db.session import Base
from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class Session(Base):
    """
    セッション情報のエンティティ。
    各ユーザーの現在のセッション状態、有効期限、および無効化時間を管理します。
    """

    __tablename__ = "sessions"

    # 一意の識別子（UUID形式）
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # ユーザーとの紐付け（削除時にカスケードで削除）
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # セッションの有効期限。期限を過ぎたセッションは無効とみなされる
    expires_at = Column(DateTime(timezone=True), nullable=False)
    # 手動またはシステムによる無効化日時（ログアウト時など）
    revoked_at = Column(DateTime(timezone=True))
    # セッション作成日時（DB側で現在時刻をセット）
    created_at = Column(DateTime(timezone=True), server_default=func.now())
