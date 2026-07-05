from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.models.session import Session as SessionModel
from sqlalchemy.orm import Session


class SessionService:
    @staticmethod
    def get_or_create_temp_token() -> str:
        """
        WebAuthnのチャレンジ用の一時的なトークンを生成・返します。
        実際の実装では、UUIDを生成し、データベースまたはRedisに一時的なレコードを作成します。
        """
        import uuid

        # ここで一意のID（例：uuid4）を生成
        temp_token = str(uuid.uuid4())
        # 必要であればここでDBに「このトークンは有効なWebAuthn用である」というフラグと共に保存する処理を追加
        return temp_token

    @staticmethod
    def create_session(db: Session, user_id: str) -> SessionModel:
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.SESSION_EXPIRE_DAYS
        )

        session = SessionModel(
            user_id=user_id,
            expires_at=expires_at,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def validate_session(db: Session, session_id: str) -> SessionModel | None:
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
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if session:
            session.revoked_at = datetime.now(timezone.utc)
            db.commit()
