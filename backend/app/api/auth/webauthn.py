import json

from app.core.config import logger, settings
from app.db.session import get_db
from app.models.credential import Credential
from app.schemas.auth import LoginOptionsRequest
from app.services.auth_options_service import AuthOptionsService
from app.services.registration_session_service import (get_challenge,
                                                       save_challenge,
                                                       validate_token)
from app.services.session_service import SessionService
from app.services.user_service import UserService
from app.services.webauthn_service import WebAuthnService
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from webauthn import (generate_authentication_options,
                      generate_registration_options,
                      verify_authentication_response,
                      verify_registration_response)
from webauthn.helpers import (base64url_to_bytes, bytes_to_base64url,
                              options_to_json)
from webauthn.helpers.exceptions import InvalidRegistrationResponse
from webauthn.helpers.structs import (AuthenticatorSelectionCriteria,
                                      ResidentKeyRequirement,
                                      UserVerificationRequirement)

router = APIRouter(prefix="/webauthn", tags=["webauthn"])


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
    logger.debug("register_options request received")

    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=400, detail="Session token missing")

    # session_token → user_id を復元
    user_id = validate_token(db, session_token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired session")

    user = UserService.read_user(db=db, user_id=user_id)

    options = generate_registration_options(
        rp_id=settings.WEB_AUTHN_RP_ID,
        rp_name="SimpleAuth",
        user_id=str(user.id).encode("utf-8"),
        user_name=user.email,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
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

    session_token = request.cookies.get("session_token")
    # session_token → user_id を復元
    user_id = validate_token(db, session_token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired session")
    challenge_data = get_challenge(db, session_token)

    try:
        verification = verify_registration_response(
            credential=payload,
            expected_challenge=challenge_data,
            expected_rp_id=settings.WEB_AUTHN_RP_ID,
            expected_origin=settings.WEB_AUTHN_ORIGIN,
        )
    except InvalidRegistrationResponse as e:
        # エラー内容をログに記録し、詳細をレスポンスに含めるか400エラーを返す
        logger.error(f"WebAuthn registration verification failed: {e}")
        raise HTTPException(status_code=400, detail="Registration verification failed.")

    # verification.credential_id は bytes型で返ることが多いため、
    # 保存前に Base64URL文字列に変換する。
    cred_id_to_save = verification.credential_id
    if isinstance(cred_id_to_save, bytes):
        cred_id_to_save = bytes_to_base64url(cred_id_to_save)

    # 登録成功時、ユーザーのステータスを verified に更新
    UserService.update_user_email_verification(db, user_id)

    WebAuthnService.register_credential(
        db=db,
        user_id=user_id,
        credential_id_str=cred_id_to_save,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        # is_discoverable=True,
    )

    return {"ok": True}


# ----------------------------
# Login
# ----------------------------
@router.options("/login/options")
async def options_login_options():
    return {}


@router.post("/login/options")
def login_options(request: Request, db: Session = Depends(get_db)):
    options = generate_authentication_options(
        rp_id=settings.WEB_AUTHN_RP_ID,
        allow_credentials=[],  # ★ 空にする（Discoverable Credential）
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    # challenge を session_token と紐付けて保存
    session_token = SessionService.get_or_create_temp_token()
    AuthOptionsService.save_auth_challenge(
        db=db,
        session_token=session_token,
        challenge=options.challenge,
    )

    return {
        "options": json.loads(options_to_json(options)),
        "session_token": session_token,
    }


@router.post("/login/verify")
def login_verify(payload: dict, response: Response, db: Session = Depends(get_db)):
    # # payload["id"] は credential_id を指すと想定
    logger.debug(
        "login_verify request received for credential_id: %s", payload.get("id")
    )

    session_token = payload.get("session_token")
    credential_id = payload.get(
        "id"
    )  # frontから送られてくるのは "id" フィールドであること

    # 1. credential_id から credential を逆引き
    cred = WebAuthnService.get_by_credential_id(db, credential_id)
    if not cred:
        logger.debug("Unknown credential id=%s", credential_id)
        raise HTTPException(400, "Unknown credential")

    # 2. session_token から challenge を取得
    challenge = AuthOptionsService.get_auth_challenge(
        db=db,
        session_token=session_token,
    )

    # 3. 検証
    verification = verify_authentication_response(
        credential=payload,
        expected_challenge=challenge,
        expected_rp_id=settings.WEB_AUTHN_RP_ID,
        expected_origin=settings.WEB_AUTHN_ORIGIN,
        credential_public_key=base64url_to_bytes(cred.public_key).strip(),
        credential_current_sign_count=cred.sign_count,
    )

    # 4. sign_count 更新
    cred.sign_count = verification.new_sign_count
    db.commit()

    # 5. ユーザー特定（ここで初めて user_id が確定）
    user_id = cred.user_id

    # 6. セッション発行
    session = SessionService.create_session(db, user_id)
    response.set_cookie(
        key="simpleauth_session",
        value=str(session.id),
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )

    return {"ok": True, "user_id": str(user_id)}
