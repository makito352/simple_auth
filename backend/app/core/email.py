# backend/app/core/email.py
import smtplib
from email.mime.text import MIMEText

from app.core.config import logger, settings


def send_otp_email(to: str, code: str):
    """
    OTP（ワンタイムパスワード）をメールで送信する関数。
    """
    # 送信前のログ
    logger.debug(f"OTPメール送信を開始: to={to}, code={code}")

    msg = MIMEText(f"Your SimpleAuth verification code is: {code}")
    msg["Subject"] = "SimpleAuth Verification Code"
    msg["From"] = "no-reply@simpleauth"
    msg["To"] = to

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as s:
            s.login(settings.SMTP_USER, settings.SMTP_PASS)
            s.send_message(msg)
        # 送信成功のログ
        logger.debug(f"OTPメール送信成功: to={to}")
    except Exception as exc:
        # 送信失敗のログ（エラーは DEBUG ではなく ERROR に設定）
        logger.error(f"OTPメール送信失敗: to={to}, error={exc}")
        raise
