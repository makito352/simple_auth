# backend/app/core/config.py
import logging

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # データベース接続情報
    DATABASE_USER: str = "simpleauth"
    DATABASE_NAME: str ="simpleauth"
    DATABASE_PASSWORD:str = "simpleauth"
    DATABASE_DB_HOST:str = "db"
    # JWT 認証用のシークレットキー
    SECRET_KEY: str = "change-me"
    # OTPの有効期限（分）
    OTP_EXPIRE_MINUTES: int = 5
    # セッションの有効期限（日）
    SESSION_EXPIRE_DAYS: int = 14
    # セッショントークン用のシークレットキー
    SESSION_TOKEN_SECRET: str = "session-secret"
    # 暗号化用（UserOptionなどの暗号化に使用）
    ENCRYPTION_KEY: str = "your-base64-encoded-key"

    # FASTAPI のルートパス（API のベースパス）
    ROOT_PATH: str = "/backend"

    # CORS origins（カンマ区切りで複数指定）
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000,http://localhost"

    # このバックエンドのベース URL
    BACKEND_BASE_URI: AnyHttpUrl = "http://localhost:8000"
    OIDC_JWT_ALG: str = "RS256"
    OIDC_JWT_PRIVATE_KEY: str = ""
    OIDC_JWT_PUBLIC_KEY: str = ""

    # PhotoPrism から見えるクライアント情報
    OIDC_CLIENT_ID: str = "photoprism"
    OIDC_CLIENT_SECRET: str = "photoprism-secret"

    # WebAuthn の設定項目
    WEB_AUTHN_RP_ID: str = "localhost"
    WEB_AUTHN_RP_NAME: str = "SimpleAuth"
    WEB_AUTHN_ORIGIN: str = "http://localhost"

    # 初期設定用
    INITIAL_ADMIN_USER_EMAIL: str = "admin@example"
    # 招待リンク用ベースアドレス
    FRONTEND_BASE_URL: str = "http://localhost"

    # 環境を示すフラグ (開発時は 'development')
    ENV: str = "production"

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

# settings の全属性をデバッグログとして出力
logger.debug("--- 読み込んだ設定値 (Settings) ---")
for key, value in settings.__dict__.items():
    # ログに出力したくない機密情報（例：パスワードやシークレットキー）はスキップまたはマスク推奨ですが、
    # 今回は全てのフィールドを表示するというご要望に基づき、全て出力します。
    if key not in ["Config", "logger"]:  # Pydanticの内部属性など不要なものを除外
        logger.debug(f"  {key}: {value}")
logger.debug("----------------------------------")
