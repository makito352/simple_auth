"""
SimpleAuth バックエンドアプリケーションのエントリポイント。

このモジュールは FastAPI を使用して Web API を構築し、以下の機能を提供します：
- WebAuthn を利用したパスワードレス認証
- OIDC（OpenID Connect）連携
- ワンタイムリンクによるログイン
- ユーザー管理および資格情報の管理
- 静的ファイルの配信
"""

from contextlib import contextmanager
from pathlib import Path

from app.api.admin.admin_dashboard_links import router as admin_dashboard_links_router
from app.api.admin.admin_user import router as admin_user_router
from app.api.admin.oidc_management import router as admin_oidc_router
from app.api.admin.user_option import router as user_option_router
from app.api.auth.init_admin import router as init_admin_router
from app.api.auth.oidc import router as oidc_router
from app.api.auth.one_time_link import router as one_time_link_router
from app.api.auth.webauthn import router as webauthn_router
from app.api.credentials_management import router as credentials_management_router
from app.api.dashboard_links import router as dashboard_links_router
from app.api.health import router as health_router
from app.api.proxy.auth_request import router as proxy_router
from app.api.user import router as user_router
from app.core.config import logger, settings
from app.core.exceptions import (
    internal_server_error_handler,
    sqlalchemy_exception_handler,
    validation_exception_handler,
)
from app.db.session import Base, SessionLocal, engine
from app.middleware.logging_middleware import access_log_middleware
from app.services.user_service import UserService
from app.utils.static_utils import ensure_static_dirs_exists
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError

# プロジェクトのルートディレクトリ（現在のファイルがある場所）を取得
BASE_DIR = Path(__file__).resolve().parent


@contextmanager
def get_db_session():
    """
    データベースセッションを管理するためのコンテキストマネージャ
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_app() -> FastAPI:
    """
    FastAPI アプリケーションを作成し、設定、ルーター、ミドルウェアを登録します。
    """
    # 開発環境ではドキュメントを有効化し、本番環境では無効化する
    docs_url = "/docs" if settings.ENV == "development" else None
    redoc_url = "/redoc" if settings.ENV == "development" else None
    openapi_url = "/openapi.json" if settings.ENV == "development" else None

    # FastAPIアプリケーションのインスタンスを作成
    app = FastAPI(
        root_path=settings.BACKEND_PROXY_PREFIX,
        title="SimpleAuth",
        description="Passwordless SSO with WebAuthn",
        version=settings.APP_VERSION,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
    )

    # ----------------------------
    # ミドルウェアの登録
    # ----------------------------
    app.middleware("http")(access_log_middleware)

    # ----------------------------
    # 例外ハンドラの登録
    # ----------------------------
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, internal_server_error_handler)

    # ----------------------------
    # CORS
    # ----------------------------
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.debug("CORS middleware 追加しました")

    # 初期管理者が存在しない場合に作成する
    #----------------------------
    with get_db_session() as db:
        UserService.initialize_system(db)

    # ----------------------------
    # ルーター登録
    # ----------------------------
    app.include_router(health_router)
    app.include_router(webauthn_router)
    app.include_router(proxy_router)
    app.include_router(oidc_router)
    app.include_router(one_time_link_router)
    app.include_router(dashboard_links_router)
    app.include_router(user_router)
    app.include_router(admin_user_router)
    app.include_router(user_option_router)
    app.include_router(admin_oidc_router)
    app.include_router(admin_dashboard_links_router)
    app.include_router(credentials_management_router)
    app.include_router(init_admin_router)

    # 静的ファイルのパスを絶対パスで指定する
    static_path = ensure_static_dirs_exists()
    static_path_str = str(static_path)
    logger.debug("静的ファイルディレクトリ: %s", static_path_str)

    # /static へのアクセスを静的ファイルとして公開
    # directoryに渡す文字列が絶対パスであることを確認
    app.mount("/static", StaticFiles(directory=static_path_str), name="static")

    return app


app = create_app()
logger.debug("アプリケーションが起動しました")
