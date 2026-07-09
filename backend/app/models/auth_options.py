"""
このモジュールはデータベース内の認証オプションを表す AuthenticationOption モデルを定義します。
AuthenticationOption モデルは、セッショントークン、チャレンジ、期限切れ時間、作成時間などのフィールドを含みます。
"""

import uuid

from app.db.session import Base
from sqlalchemy import TIMESTAMP, Column, String
from sqlalchemy.dialects.postgresql import BYTEA, UUID
from sqlalchemy.sql import func


class AuthenticationOption(Base):
    """
    認証オプションのデータベースモデル。
    ユーザーの認証プロセスに関連するセッション情報やチャレンジ応答を管理します。
    """

    __tablename__ = "authentication_options"

    # 一意の識別子 (UUID)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # セッション識別用のトークン
    session_token = Column(String, nullable=False)
    # 認証チャレンジ用データ（バイナリ形式）
    challenge = Column(BYTEA, nullable=False)
    # 有効期限のタイムスタンプ
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    # レコードの作成日時（サーバー側で現在時刻を自動設定）
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self):
        return f"<AuthenticationOption(id={self.id}, session_token={self.session_token}, expires_at={self.expires_at})>"
