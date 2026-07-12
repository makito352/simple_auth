"""
アプリケーションの設定を管理するモジュール。
このモジュールでは、環境変数や設定ファイルから設定値を読み込み、アプリケーション全体で使用できるようにします。
"""

import logging

from pydantic import AnyHttpUrl, EmailStr, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    アプリケーションの設定を管理するクラス。
    このクラスは Pydantic の BaseSettings を継承しており、環境変数や設定ファイルから設定値を読み込むことができます。
    """

    # アプリケーションのバージョン
    APP_VERSION: str = "1.0.0"
    # データベース接続情報
    DATABASE_USER: str = "simpleauth"
    DATABASE_NAME: str = "simpleauth"
    DATABASE_PASSWORD: str = "simpleauth"
    DATABASE_DB_HOST: str = "db"
    # JWT 認証用のシークレットキー
    SECRET_KEY: str = "change-me"
    # セッションの有効期限（日）
    SESSION_EXPIRE_DAYS: int = 14
    # ワンタイムリンク（新規登録用）の有効期限（分）
    ONE_TIME_LINK_EXPIRE_MINUTES: int = 60
    # ワンタイムリンク（デバイス登録用）の有効期限（分）
    DEVICE_REGISTRATION_LINK_EXPIRE_MINUTES: int = 5
    # WebAuthn 認証オプションの有効期限（分）
    WEBAUTHN_OPTIONS_EXP_MINUTES: int = 5
    # 一時的なセッショントークンの名前（WebAuthn登録用など）
    WEB_AUTHN_TEMP_TOKEN_NAME: str = "simpleauth_temp_session_token"
    # ログイン後の通常のセッションクッキーの名前
    SESSION_COOKIE_NAME: str = "simpleauth_session"
    # セッショントークン用のシークレットキー
    SESSION_TOKEN_SECRET: str = "session-secret"
    # 暗号化用（UserOptionなどの暗号化に使用）
    ENCRYPTION_KEY: str = "your-base64-encoded-key"

    # FASTAPI のルートパス（API のベースパス）
    BACKEND_PROXY_PREFIX: str = "/backend"

    # CORS origins（カンマ区切りで複数指定）
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000,http://localhost"
    # リバースプロキシから転送されたヘッダーを信頼するかどうか
    TRUST_PROXY_HEADERS: bool = False
    # X-Forwarded-For を受け入れる送信元プロキシIP/CIDRの一覧
    TRUSTED_PROXY_IPS: str = ""

    # このバックエンドのベース URL
    BACKEND_BASE_URI: AnyHttpUrl = "http://localhost:8000"
    OIDC_JWT_ALG: str = "RS256"
    # ファイルパスの設定（初期値として定義）
    OIDC_JWT_PRIVATE_KEY_PATH: str = "/app/keys/oidc_private.pem"
    OIDC_JWT_PUBLIC_KEY_PATH: str = "/app/keys/oidc_public.pem"

    # ファイルから読み込んだ中身を格納するフィールド（初期値を空文字にする）
    OIDC_JWT_PRIVATE_KEY: str = ""
    OIDC_JWT_PUBLIC_KEY: str = ""

    # WebAuthn の設定項目
    WEB_AUTHN_RP_ID: str = "localhost"
    WEB_AUTHN_RP_NAME: str = "SimpleAuth"
    WEB_AUTHN_ORIGIN: str = "http://localhost"

    # 初期設定用の管理者ユーザーのメールアドレス（登録済みの場合は None）
    INITIAL_ADMIN_USER_EMAIL: str | None = Field(
        default=None,
        description="初期管理者ユーザーのメールアドレス（未設定の場合は None）",
    )
    # 初期設定用の管理者ユーザーのパスワード（登録済みの場合は Noneにすること）
    INITIAL_ADMIN_USER_PASSWORD: str | None = Field(
        default=None, description="初期設定用の管理者ユーザーのパスワード"
    )
    # 招待リンク用ベースアドレス
    FRONTEND_BASE_URL: str = "http://localhost"

    # 環境を示すフラグ (開発時は 'development')
    ENV: str = "production"

    class Config:
        env_file = ".env"


settings = Settings()


# ファイルからキーを読み込む処理（インスタンス生成後に実行）
try:
    with open(settings.OIDC_JWT_PRIVATE_KEY_PATH, "r") as f:
        settings.OIDC_JWT_PRIVATE_KEY = f.read()
    with open(settings.OIDC_JWT_PUBLIC_KEY_PATH, "r") as f:
        settings.OIDC_JWT_PUBLIC_KEY = f.read()
except FileNotFoundError as e:
    # ファイルがない場合に備えたエラーハンドリング
    logging.error(f"Certificate file not found: {e}")

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

# ログ出力時にマスクする項目を定義
SENSITIVE_FIELDS = [
    "SECRET_KEY",
    "SESSION_TOKEN_SECRET",
    "ENCRYPTION_KEY",
    "OIDC_JWT_PRIVATE_KEY",
    "OIDC_JWT_PUBLIC_KEY",
]

# settings の全属性をデバッグログとして出力
logger.debug("--- 読み込んだ設定値 (Settings) ---")
for key, value in settings.__dict__.items():
    if key == "Config" or key == "logger":
        continue

    # 機密情報の場合はマスクする
    if key in SENSITIVE_FIELDS:
        logger.debug("  %s: [MASKED]", key)
    else:
        logger.debug("  %s: %s", key, value)
logger.debug("----------------------------------")
