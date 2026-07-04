from app.core.config import logger
from app.models.credential import Credential
from sqlalchemy.orm import Session
from webauthn.helpers import bytes_to_base64url


class WebAuthnService:

    @staticmethod
    def register_credential(
        db: Session,
        user_id: str,
        credential_id_str: str,
        public_key: str,
        sign_count: int,
        device_name: str | None = None,
    ):
        logger.debug("register_credential called with user_id: %s", user_id)
        logger.debug(
            "DEBUG_REGISTER: raw public_key value = %s (type: %s)",
            public_key,
            type(public_key),
        )

        # credential_id_str,public_key は webauthn ライブラリから返される bytes 型の場合があるため、
        # 確実に Base64URL 文字列として保存するように変換処理を挟む。
        if isinstance(credential_id_str, bytes):
            credential_id_str = bytes_to_base64url(credential_id_str)
        if isinstance(public_key, bytes):
            public_key = bytes_to_base64url(public_key)

        cred = Credential(
            user_id=user_id,
            credential_id=credential_id_str,
            public_key=public_key,
            sign_count=sign_count,
            device_name=device_name,
        )
        try:
            db.add(cred)
            db.commit()
            db.refresh(cred)
            logger.debug("Credential registered successfully")
        except Exception as e:
            logger.error(f"DB commit failed: {e}")
            db.rollback()
            raise
        return cred

    @staticmethod
    def get_credentials(db: Session, user_id: str):
        return db.query(Credential).filter(Credential.user_id == user_id).all()

    @staticmethod
    def get_by_credential_id(db: Session, credential_id: str):
        return (
            db.query(Credential)
            .filter(Credential.credential_id == credential_id)
            .first()
        )
