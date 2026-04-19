# backend/app/core/config.py
import logging

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # データベース接続情報
    DATABASE_URL: str = "postgresql+psycopg2://user:pass@db/simpleauth"
    # JWT 認証用のシークレットキー
    SECRET_KEY: str = "change-me"
    # OTPの有効期限（分）
    OTP_EXPIRE_MINUTES: int = 5
    # セッションの有効期限（日）
    SESSION_EXPIRE_DAYS: int = 14
    # セッショントークン用のシークレットキー
    SESSION_TOKEN_SECRET: str = "session-secret"

    # SMTP 用設定項目
    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "user@example.com"
    SMTP_PASS: str = "smtp-secret"

    # WebAuthn の設定項目
    WEB_AUTHN_RP_ID: str = "localhost"
    WEB_AUTHN_RP_NAME: str = "SimpleAuth"
    WEB_AUTHN_ORIGIN: str = "http://localhost"

    # 環境を示すフラグ (開発時は 'development')
    ENV: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()

# ------------------------------
# ログ設定
# ------------------------------
log_level = logging.DEBUG if settings.ENV == "development" else logging.INFO
logging.basicConfig(
    level=log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("app")
