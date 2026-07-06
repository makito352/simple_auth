import json

from app.core.config import logger, settings
from app.db.session import get_db
from app.schemas.auth import CredentialCommentUpdateRequest, CredentialOut
from app.services.auth_options_service import AuthOptionsService
from app.services.registration_session_service import (get_challenge,
                                                       save_challenge,
                                                       validate_token)
from app.services.session_service import SessionService
from app.services.user_service import UserService
from app.services.webauthn_service import WebAuthnService
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from uuid import UUID
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


def get_current_user_id(request: Request, db: Session) -> UUID:
    """
    セッションクッキーから現在のユーザーIDを取得する。
    """
    session_id = request.cookies.get("simpleauth_session")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    session = SessionService.validate_session(db, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    return session.user_id


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
    logger.debug("register_options request received")
    return issue_registration_options(request, db)


@router.options("/register/verify")
async def options_register_verify():
    return {}


@router.post("/register/verify")
def register_verify(payload: dict, request: Request, db: Session = Depends(get_db)):
    logger.debug("register_verify request received")
    return verify_registration_and_store(
        payload=payload,
        request=request,
        db=db,
        update_user_verification=True,
    )


@router.options("/devices/register/options")
async def options_device_register_options():
    return {}


@router.post("/devices/register/options")
def device_register_options(request: Request, db: Session = Depends(get_db)):
    """
    追加デバイス登録専用のオプション発行API。
    """
    logger.debug("device_register_options request received")
    return issue_registration_options(request, db)


@router.options("/devices/register/verify")
async def options_device_register_verify():
    return {}


@router.post("/devices/register/verify")
def device_register_verify(payload: dict, request: Request, db: Session = Depends(get_db)):
    """
    追加デバイス登録専用の検証API。
    ユーザーステータスは更新しない。
    """
    logger.debug("device_register_verify request received")
    return verify_registration_and_store(
        payload=payload,
        request=request,
        db=db,
        update_user_verification=False,
    )


def issue_registration_options(request: Request, db: Session):
    """
    セッショントークンからユーザーを解決し、WebAuthn登録オプションを発行する。
    """
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=400, detail="Session token missing")

    user_id = validate_token(db, session_token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired session")

    user = UserService.read_user(db=db, user_id=user_id)
    options = generate_registration_options(
        rp_id=settings.WEB_AUTHN_RP_ID,
        rp_name=settings.WEB_AUTHN_RP_NAME,
        user_id=str(user.id).encode("utf-8"),
        user_name=user.email,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )

    save_challenge(db, session_token, options.challenge)
    return json.loads(options_to_json(options))


def verify_registration_and_store(
    payload: dict,
    request: Request,
    db: Session,
    update_user_verification: bool,
):
    """
    WebAuthn登録レスポンスを検証し、資格情報を保存する共通処理。
    """
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=400, detail="Session token missing")

    user_id = validate_token(db, session_token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired session")

    challenge_data = get_challenge(db, session_token)
    device_name = payload.get("device_name")
    credential_payload = {key: value for key, value in payload.items() if key != "device_name"}

    try:
        verification = verify_registration_response(
            credential=credential_payload,
            expected_challenge=challenge_data,
            expected_rp_id=settings.WEB_AUTHN_RP_ID,
            expected_origin=settings.WEB_AUTHN_ORIGIN,
        )
    except InvalidRegistrationResponse as e:
        logger.error(f"WebAuthn registration verification failed: {e}")
        raise HTTPException(status_code=400, detail="Registration verification failed.")

    cred_id_to_save = verification.credential_id
    if isinstance(cred_id_to_save, bytes):
        cred_id_to_save = bytes_to_base64url(cred_id_to_save)

    if update_user_verification:
        UserService.update_user_email_verification(db, user_id)

    WebAuthnService.register_credential(
        db=db,
        user_id=user_id,
        credential_id_str=cred_id_to_save,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        device_name=device_name,
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


@router.get("/credentials", response_model=list[CredentialOut])
def list_credentials(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    ログイン中ユーザーに紐づくWebAuthn資格情報一覧を返す。
    """
    current_user_id = get_current_user_id(request, db)
    credentials = WebAuthnService.get_credentials(db, current_user_id)
    return credentials


@router.patch("/credentials/{credential_id}/comment")
def update_credential_comment(
    credential_id: str,
    payload: CredentialCommentUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    ログイン中ユーザーが自身の資格情報コメントを更新する。
    """
    current_user_id = get_current_user_id(request, db)
    credential = WebAuthnService.get_by_credential_id_and_user_id(
        db,
        credential_id,
        current_user_id,
    )
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found",
        )

    WebAuthnService.update_credential_comment(db, credential_id, payload.comment)
    return {"ok": True}


@router.delete("/credentials/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credential(
    credential_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    ログイン中ユーザーが自身の資格情報を削除する。
    """
    current_user_id = get_current_user_id(request, db)
    credential = WebAuthnService.get_by_credential_id_and_user_id(
        db,
        credential_id,
        current_user_id,
    )
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found",
        )

    WebAuthnService.delete_credential(db, credential_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
