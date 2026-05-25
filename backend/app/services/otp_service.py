# backend/app/services/otp_service.py
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import logger, settings
from app.models.otp import OTPCode


class OTPService:
    @staticmethod
    def generate_code() -> str:
        code = f"{random.randint(0, 999999):06d}"
        logger.debug(f"生成された OTP コード: {code}")
        return code

    @staticmethod
    def create_otp(db: Session, user_id: str) -> OTPCode:
        code = OTPService.generate_code()
        expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        otp = OTPCode(
            user_id=user_id,
            code=code,
            expires_at=expires_at,
        )
        db.add(otp)
        db.commit()
        db.refresh(otp)

        logger.info(f"OTP を作成しました (user_id={user_id})")
        return otp

    @staticmethod
    def verify_otp(db: Session, user_id: str, code: str) -> bool:
        otp = (
            db.query(OTPCode)
            .filter(
                OTPCode.user_id == user_id,
                OTPCode.code == code,
                OTPCode.used_at.is_(None),
                OTPCode.expires_at > datetime.utcnow(),
            )
            .first()
        )

        if not otp:
            logger.warning(f"OTP 検証失敗: user_id={user_id}, code={code}")
            return False

        otp.used_at = datetime.utcnow()
        db.commit()
        logger.info(f"OTP 検証成功: user_id={user_id}")
        return True
