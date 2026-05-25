import json

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, options_to_json,bytes_to_base64url
from webauthn.helpers.structs import PublicKeyCredentialDescriptor

from app.core.config import logger, settings
from app.db.session import SessionLocal
from app.models.credential import Credential
from app.schemas.auth import LoginOptionsRequest
from app.services.auth_options_service import AuthOptionsService
from app.services.registration_session_service import (
    get_challenge,
    save_challenge,
    validate_token,
)
from app.services.session_service import SessionService
from app.services.user_service import UserService
from app.services.webauthn_service import WebAuthnService

router = APIRouter(prefix="/webauthn", tags=["webauthn"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----------------------------
# Registration
# ----------------------------
@router.options("/register/options")
async def options_register_options():
    return {}


@router.post(
    "/register/options",
)
def register_options(request: Request, db: Session = Depends(get_db)):
    # 開始ログ
    # logger.info("register_options request received")

    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=400, detail="Session token missing")

    # session_token → user_id を復元
    user_id = validate_token(db, session_token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired session")

    user = UserService.read_user(db=db, user_id=user_id)

    user_id_bytes = str(user.id).encode()

    options = generate_registration_options(
        rp_id=settings.WEB_AUTHN_RP_ID,
        rp_name=settings.WEB_AUTHN_RP_NAME,
        user_id=user_id_bytes,
        user_name=user.email,
    )

    # チャレンジをDBに保存する
    save_challenge(db, session_token, options.challenge)

    return json.loads(options_to_json(options))


@router.options("/register/verify")
async def options_register_verify():
    return {}


@router.post("/register/verify")
def register_verify(payload: dict, request: Request, db: Session = Depends(get_db)):
    # 開始ログ
    logger.debug("register_verify request received")

    # 1. セッションからユーザー特定とチャレンジの取得
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=400, detail="Session token missing")

    user_id = validate_token(db, session_token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired session")

    expected_challenge = get_challenge(db, session_token)  # 保存したチャレンジを取得
    if not expected_challenge:
        raise HTTPException(status_code=400, detail="Invalid or expired session")

    try:
        logger.debug("payload: %s", payload)
        verification = verify_registration_response(
            credential=payload,
            expected_challenge=expected_challenge,
            expected_rp_id=settings.WEB_AUTHN_RP_ID,
            expected_origin=settings.WEB_AUTHN_ORIGIN,
        )
    except Exception as e:
        raise HTTPException(400, f"Verification failed: {e}")

    cred = WebAuthnService.register_credential(
        db=db,
        user_id=user_id,
        credential_id_str=bytes_to_base64url(verification.credential_id),
        public_key=bytes_to_base64url(verification.credential_public_key),
        sign_count=verification.sign_count,
    )

    return {"ok": True}


# ----------------------------
# Login
# ----------------------------
@router.options("/login/options")
async def options_login_options():
    return {}


@router.post("/login/options")
def login_options(request_body: LoginOptionsRequest, db: Session = Depends(get_db)):
    # 開始ログ
    logger.debug("login_options request received")

    user = UserService.read_user_by_email(db=db, email=request_body.email)
    if not user:
        raise HTTPException(404, "User not found")
    logger.debug("userid:%s", user.id)

    creds = WebAuthnService.get_credentials(db, user.id)
    logger.debug("creds %s",creds)
    logger.debug(f"creds count: {len(creds)}")
    # options = generate_authentication_options(
    #     rp_id=settings.WEB_AUTHN_RP_ID,
    #     allow_credentials=[c.credential_id for c in creds],
    # )
    # allow_credentials = [
    #     PublicKeyCredentialDescriptor(id=c.credential_id.encode())
    #     for c in creds
    # ]

    # options = generate_authentication_options(
    #     rp_id=settings.WEB_AUTHN_RP_ID,
    #     allow_credentials=allow_credentials, # オブジェクトのリストを渡す
    # )
    allow_credentials = []
    for c in creds:
        logger.debug("cred=%s",c)
        try:
            # 文字列(Base64URL)をバイナリに変換
            cred_id_bytes = base64url_to_bytes(c.credential_id)
            allow_credentials.append(PublicKeyCredentialDescriptor(id=cred_id_bytes))
        except Exception as e:
            logger.error(f"Failed to decode credential ID: {c.credential_id}")
            continue
    logger.debug("allow_credentials: %s", allow_credentials)
    if allow_credentials == []:
        logger.error("No valid credentials found for user_id=%s", user.id)
        raise HTTPException(500, "No valid credentials")

    options = generate_authentication_options(
        rp_id=settings.WEB_AUTHN_RP_ID,
        allow_credentials=allow_credentials,
    )

    # 認証チャレンジ 保存
    AuthOptionsService.save_auth_challenge(
        db, user_id=user.id, challenge=options.challenge
    )

    return json.loads(options_to_json(options))


@router.options("/login/verify")
async def options_login_verify():
    return {}


@router.post("/login/verify")
def login_verify(payload: dict, response: Response, db: Session = Depends(get_db)):
    # 開始ログ
    logger.debug("login_verify request received id=%s",payload["id"])
    try:
        # verification = verify_authentication_response(
        #     credential=payload,
        #     expected_rp_id=settings.WEB_AUTHN_RP_ID,
        #     expected_origin=settings.WEB_AUTHN_ORIGIN,
        #     credential_public_key="",
        #     credential_current_sign_count=0,
        # )
        cred = WebAuthnService.get_by_credential_id(db, payload["id"])
        if not cred:
            logger.error("No cred found for user_id: %s", payload["id"])
            raise HTTPException(400, "Verification failed: saved challenge found")
        
        saved_challenge = AuthOptionsService.get_auth_challenge(
            db=db, user_id=cred.user_id
        )
        if not saved_challenge:
            logger.error("No saved challenge found for user_id: %s", payload["id"])
            raise HTTPException(400, "Verification failed: saved challenge found")

        logger.debug("lverify_authentication_response called with payload: %s",payload)
        verification = verify_authentication_response(
            credential=payload,
            expected_challenge=saved_challenge,
            expected_rp_id=settings.WEB_AUTHN_RP_ID,
            expected_origin=settings.WEB_AUTHN_ORIGIN,
            credential_public_key=base64url_to_bytes(cred.public_key),
            credential_current_sign_count=cred.sign_count,
        )
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        raise HTTPException(400, f"Verification failed: {e}")

    # cred = WebAuthnService.get_by_credential_id(db, verification.credential_id)
    # if not cred:
    #     raise HTTPException(404, "Credential not found")

    # sign_count 更新
    cred.sign_count = verification.new_sign_count
    db.commit()

    # セッション作成
    session = SessionService.create_session(db, cred.user_id)

    # Cookie 発行
    response.set_cookie(
        key="simpleauth_session",
        value=str(session.id),
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    return {"ok": True, "user_id": str(cred.user_id)}
