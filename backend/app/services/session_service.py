from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.session import Session as SessionModel


class SessionService:

    @staticmethod
    def create_session(db: Session, user_id: str) -> SessionModel:
        expires_at = datetime.utcnow() + timedelta(days=settings.SESSION_EXPIRE_DAYS)

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
                SessionModel.expires_at > datetime.utcnow(),
                SessionModel.revoked_at.is_(None),
            )
            .first()
        )
        return session

    @staticmethod
    def revoke_session(db: Session, session_id: str):
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if session:
            session.revoked_at = datetime.utcnow()
            db.commit()
