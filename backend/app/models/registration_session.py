"""
登録セッション管理モデル
ユーザーの電話番号認証やメール認証などの認証フローにおける一時的な状態を管理します。
"""
import uuid

from app.db.session import Base
from sqlalchemy import Column, DateTime, ForeignKey, LargeBinary, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class RegistrationSession(Base):
    """
    登録セッションエンティティ
    ユーザーの認証プロセス中の一時的な情報を保持するテーブルに対応します。
    """
    __tablename__ = "registration_sessions"

    # ユニークなID (UUID)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # 紐づくユーザーのID
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    
    # セッション識別用トークン（ユニーク）
    session_token = Column(String, unique=True, nullable=False)
    
    # キャプチャやOTPなどの検証用データ
    challenge = Column(LargeBinary)
    
    # セッションの有効期限
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # 認証に利用された日時（完了後にセット）
    used_at = Column(DateTime(timezone=True))
    
    # レコード作成日時
    created_at = Column(DateTime(timezone=True), server_default=func.now())
