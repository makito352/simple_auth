"""
SessionServiceは、セッション管理に関連するビジネスロジックを提供します。
このサービスは、ユーザーのセッションを作成、検証、取り消すためのメソッドを提供します。
"""

from datetime import datetime, timedelta, timezone

from app.core.config import logger, settings
from app.models.session import Session as SessionModel
from sqlalchemy.orm import Session


class SessionService:
    @staticmethod
    def get_or_create_temp_token() -> str:
        """
        WebAuthnのチャレンジ用の一時的なトークンを生成・返します。
        """
        import uuid

        # ここで一意のID（例：uuid4）を生成
        temp_token = str(uuid.uuid4())

        return temp_token

    @staticmethod
    def create_session(db: Session, user_id: str) -> SessionModel:
        """
        新しいセッションを作成し、データベースに保存します。
        """

        # セッションの有効期限を設定
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.SESSION_EXPIRE_DAYS
        )

        # 新しいセッションを作成
        session = SessionModel(
            user_id=user_id,
            expires_at=expires_at,
        )

        # データベースに保存
        db.add(session)
        db.commit()
        db.refresh(session)

        return session

    @staticmethod
    def validate_session(db: Session, session_id: str) -> SessionModel | None:
        """
        セッションIDを検証し、有効なセッションを返します。
        セッションが無効または期限切れの場合はNoneを返します。
        """
        # データベースからセッションを取得
        session = (
            db.query(SessionModel)
            .filter(
                SessionModel.id == session_id,
                SessionModel.expires_at > datetime.now(timezone.utc),
                SessionModel.revoked_at.is_(None),
            )
            .first()
        )
        return session

    @staticmethod
    def revoke_session(db: Session, session_id: str):
        """
        指定されたセッションIDのセッションを取り消します。
        """
        # データベースからセッションを取得
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()

        # 取り消し日時を設定
        if session:
            session.revoked_at = datetime.now(timezone.utc)
            db.commit()
        else:
            logger.debug("Session with ID %s not found for revocation.", session_id)
