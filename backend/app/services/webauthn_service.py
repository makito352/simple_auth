"""
WebAuthnService: WebAuthn 認証に関連する操作を行うサービスクラス
"""

from app.core.config import logger
from app.models.credential import Credential
from sqlalchemy.orm import Session
from webauthn.helpers import bytes_to_base64url

ALLOWED_DEVICE_NAMES = {
    "Windows",
    "iOS",
    "macOS",
    "Linux",
    "Android",
    "Unknown",
}


def normalize_device_name(device_name: str | None) -> str:
    # 保存値を固定集合に寄せて、監査ログでの集計を安定させる
    if not device_name:
        return "Unknown"

    normalized_device_name = device_name.strip()
    if normalized_device_name in ALLOWED_DEVICE_NAMES:
        return normalized_device_name

    return "Unknown"


class WebAuthnService:

    @staticmethod
    def register_credential(
        db: Session,
        user_id: str,
        credential_id_str: str,
        public_key: str,
        sign_count: int,
        device_name: str | None = None,
        user_comment: str | None = None,
    ):
        """
        新しい資格情報を登録します。
        """
        logger.debug("register_credential called with user_id: %s", user_id)
        # 機密情報はデバッグでも出力しないようにする
        # logger.debug(
        #     "DEBUG_REGISTER: raw public_key value = %s (type: %s)",
        #     public_key,
        #     type(public_key),
        # )

        # credential_id_str,public_key は webauthn ライブラリから返される bytes 型の場合があるため、
        # 確実に Base64URL 文字列として保存するように変換処理を挟む。
        if isinstance(credential_id_str, bytes):
            credential_id_str = bytes_to_base64url(credential_id_str)
        if isinstance(public_key, bytes):
            public_key = bytes_to_base64url(public_key)
        normalized_device_name = normalize_device_name(device_name)

        cred = Credential(
            user_id=user_id,
            credential_id=credential_id_str,
            public_key=public_key,
            sign_count=sign_count,
            device_name=normalized_device_name,
            user_comment=user_comment,
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
    def update_credential_comment(
        db: Session, credential_id: str, comment: str | None
    ) -> bool:
        """
        特定の資格情報のユーザーコメントのみを更新する。
        成功した場合は True を返す。
        """
        cred = (
            db.query(Credential)
            .filter(Credential.credential_id == credential_id)
            .first()
        )
        if not cred:
            logger.error(
                "Update failed: Credential with ID %s not found", credential_id
            )
            raise ValueError(f"Credential {credential_id} not found")

        cred.user_comment = comment
        try:
            db.commit()
            db.refresh(cred)
            logger.debug("Comment updated successfully for id: %s", credential_id)
            return True
        except Exception as e:
            logger.error(f"DB update failed: {e}")
            db.rollback()
            raise

    @staticmethod
    def get_credentials(db: Session, user_id: str):
        """
        指定されたユーザーIDに関連付けられたすべての資格情報を取得します。
        """
        return db.query(Credential).filter(Credential.user_id == user_id).all()

    @staticmethod
    def get_by_credential_id(db: Session, credential_id: str):
        """
        指定された credential_id に基づいて資格情報を取得します。
        """
        return (
            db.query(Credential)
            .filter(Credential.credential_id == credential_id)
            .first()
        )

    @staticmethod
    def get_by_credential_id_and_user_id(db: Session, credential_id: str, user_id: str):
        """
        資格情報IDとユーザーIDの組み合わせで資格情報を取得する。
        """
        return (
            db.query(Credential)
            .filter(
                Credential.credential_id == credential_id,
                Credential.user_id == user_id,
            )
            .first()
        )

    @staticmethod
    def delete_credential(db: Session, credential_id: str) -> bool:
        """
        指定された credential_id に基づいて資格情報を削除する。
        成功した場合は True を返す。
        """
        cred = (
            db.query(Credential)
            .filter(Credential.credential_id == credential_id)
            .first()
        )
        if not cred:
            logger.error(
                "Delete failed: Credential with ID %s not found", credential_id
            )
            raise ValueError(f"Credential {credential_id} not found")

        try:
            db.delete(cred)
            db.commit()
            logger.debug("Credential deleted successfully for id: %s", credential_id)
            return True
        except Exception as e:
            logger.error(f"DB delete failed: {e}")
            db.rollback()
            raise
