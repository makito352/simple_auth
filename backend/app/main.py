from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth.otp import router as otp_router
from app.api.auth.webauthn import router as webauthn_router
from app.api.health import router as health_router
from app.api.proxy.auth_request import router as proxy_router
from app.api.auth.oidc import router as oidc_router
from app.core.config import logger,settings
from app.db.session import Base, engine


def create_app() -> FastAPI:
    app = FastAPI(
        root_path=settings.ROOT_PATH,
        title="SimpleAuth",
        description="Passwordless SSO with WebAuthn + OTP",
        version="1.0.0",
    )

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
    app.include_router(oidc_router)

    return app


app = create_app()
logger.info("アプリケーションが起動しました")
