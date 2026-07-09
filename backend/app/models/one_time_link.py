"""
ワンタイムリンク管理モジュール
このモジュールは、特定の操作（パスワードリセットや登録など）のために発行される
一時的なトークンに関連するエンティティを定義します。
"""
import uuid

from app.db.session import Base
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class OneTimeLink(Base):
    """
    管理画面から発行されるワンタイムアクセスURL用のトークンを管理するモデル。

    属性:
        id (UUID): レコードの一意識別子。
        user_id (UUID): このリンクに関連付けられたユーザーのID。
        token (String): URLに含まれるユニークな識別子（例: "rand_string_123"）。
        type (String): 用途の分類（例: "registration", "password_reset"）。
        expires_at (DateTime): トークンの有効期限。
        used_at (DateTime): 使用済みになった日時。NULLの場合は未実行を意味する。
        created_at (DateTime): レコード作成日時。
    """

    __tablename__ = "one_time_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # user_id: このリンクに関連付けられたユーザーの外部キー
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # token: URLで使用される、重複を許容しない一意の識別子
    token = Column(String, nullable=False, unique=True)
    # type: トークンの用途（「registration」「password_reset」など）
    type = Column(String, nullable=False)
    # expires_at: トークンの有効期限
    expires_at = Column(DateTime(timezone=True), nullable=False)
    # used_at: 使用済みになった日時（NULLなら未使用）
    used_at = Column(DateTime(timezone=True), nullable=True)
    # created_at: システムによる自動生成の作成日時
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        """
        オブジェクトの文字列表現を返す。
        """
        return (
            f"<OneTimeLink(id={self.id}, token={self.token}, used_at={self.used_at})>"
        )
