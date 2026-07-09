"""
ユーザー情報を管理するモデル。
メール認証状態や権限（Role）などの基本情報を保持します。
"""
import uuid

from app.db.session import Base
from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class User(Base):
    """
    ユーザーテーブルの定義。
    """
    __tablename__ = "users"

    # 固有の識別子（UUID）
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # メール認証ステータス
    # - "pending": ワンタイムリンク生成済み。WebAuthn未登録
    # - "verified": WebAuthn登録済み（認証完了）
    # - "expired": 有効期限切れ
    # - "disabled": 管理者等によって手動無効化
    email_verification_status = Column(String, nullable=False)
    
    # ユーザーのメールアドレス（ユニーク制約あり）
    email = Column(String, unique=True, nullable=False)
    
    # メール認証が完了した日時
    email_verified_at = Column(DateTime(timezone=True))
    
    # メール認証リンクの有効期限
    email_verification_expires_at = Column(DateTime(timezone=True))
    
    # ユーザーの権限（ロール）
    # - "user": 一般ユーザー権限
    # - "admin": 管理者権限
    role = Column(String, default="user", nullable=False)
    
    # アカウント作成日時
    created_at = Column(DateTime(timezone=True), server_default=func.now())
