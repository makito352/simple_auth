from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth.otp import router as otp_router
from app.api.auth.webauthn import router as webauthn_router
from app.api.health import router as health_router
from app.api.proxy.auth_request import router as proxy_router
from app.core.config import logger
from app.db.session import Base, engine


def create_app() -> FastAPI:
    app = FastAPI(
        title="SimpleAuth",
        description="Passwordless SSO with WebAuthn + OTP",
        version="1.0.0",
    )

    # ----------------------------
    # CORS
    # ----------------------------
    origins = ["http://localhost:3000", "http://localhost:8000"]
    app.add_middleware(
        CORSMiddleware,
        # allow_origins=["*"],  # 必要に応じて frontend の URL に限定
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        # allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        # allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "Access-Control-Allow-Origin"],
    )
    logger.debug("CORS middleware 追加しました")

    # ----------------------------
    # DB 初期化（初回のみ）
    # ----------------------------
    Base.metadata.create_all(bind=engine)

    # ----------------------------
    # ルーター登録
    # ----------------------------
    app.include_router(health_router)
    app.include_router(otp_router)
    app.include_router(webauthn_router)
    app.include_router(proxy_router)

    return app


app = create_app()
logger.info("アプリケーションが起動しました")
