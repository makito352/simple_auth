from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import logger
from app.models.auth_options import AuthenticationOption

OPTION_VALIDITY_PERIOD = 5


class AuthOptionsService:

    @staticmethod
    def save_auth_challenge(
        db: Session,
        user_id: str,
        challenge: bytes,
    ):
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=OPTION_VALIDITY_PERIOD
        )

        auth_option = AuthenticationOption(
            user_id=user_id, challenge=challenge, expires_at=expires_at
        )
        db.add(auth_option)
        db.commit()
        db.refresh(auth_option)
        return auth_option

    @staticmethod
    def get_auth_challenge(
        db: Session,
        user_id: str,
    ):
        current_time = datetime.now(timezone.utc)

        auth_option = (
            db.query(AuthenticationOption)
            .filter(
                AuthenticationOption.user_id == user_id,
                AuthenticationOption.expires_at > current_time,
            )
            .first()
        )

        return auth_option.challenge if auth_option else None
