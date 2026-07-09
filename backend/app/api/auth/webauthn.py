"""
WebAuthn認証用APIエンドポイント。

このモジュールは、FIDO2/WebAuthnプロトコルに基づいたパスキーの登録およびログイン処理を提供します。
具体的には以下の機能を含みます：
- 新規デバイスの登録（オプションの発行と検証）
- 既存デバイスによるログイン（Discoverable Credentialsを含む）
- セッション管理との連携

エンドポイントは、フロントエンドからのリクエストを受け取り、WebAuthnライブラリを用いて認証処理を行います。
"""

import json
from typing import Any

from app.core.config import logger, settings
from app.db.session import get_db
from app.schemas.auth import LoginOptionsResponse
from app.services.auth_options_service import AuthOptionsService
from app.services.registration_session_service import (
    get_challenge,
    save_challenge,
    validate_token,
)
from app.services.session_service import SessionService
from app.services.user_service import UserService
from app.services.webauthn_service import WebAuthnService
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url, options_to_json
from webauthn.helpers.exceptions import InvalidRegistrationResponse
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

router = APIRouter(prefix="/webauthn", tags=["webauthn"])


# ----------------------------
# Registration
# ----------------------------
def _verify_registration_and_store(
    payload: dict[str, Any],
    request: Request,
    db: Session,
    update_user_verification: bool,
) -> Response:
    """
    WebAuthnの登録レスポンスを検証し、有効な場合はデータベースに保存します。

    Args:
        payload (dict): フロントエンドから送信されたWebAuthnの応答データ
        request (Request): クライアントからのリクエスト（Cookie等を含む）
        db (Session): データベースセッション
        update_user_verification (bool): 成功時にユーザーのメール検証済みフラグを更新するかどうか

    Returns:
        Response: 成功時に204 No Contentを返すレスポンス
    """
    session_token = request.cookies.get(settings.WEB_AUTHN_TEMP_TOKEN_NAME)
    if not session_token:
        logger.error("Session token missing in request cookies")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Session token missing"
        )

    user_id = validate_token(db, session_token)
    if not user_id:
        logger.error("Invalid or expired session token")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired session",
        )

    # 保存されているチャレンジを取得
    challenge_data = get_challenge(db, session_token)
    device_name = payload.get("device_name")
    # 非WebAuthn関連のフィールド（device_name等）を除外して検証に渡す
    credential_payload = {
        key: value for key, value in payload.items() if key != "device_name"
    }

    try:
        # WebAuthnプロトコルに基づいた署名の検証
        verification = verify_registration_response(
            credential=credential_payload,
            expected_challenge=challenge_data,
            expected_rp_id=settings.WEB_AUTHN_RP_ID,
            expected_origin=settings.WEB_AUTHN_ORIGIN,
        )
    except InvalidRegistrationResponse as e:
        logger.error(f"WebAuthn registration verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration verification failed.",
        )

    # credential_idをデータベース保存用にBase64URL形式に変換
    cred_id_to_save = verification.credential_id
    if isinstance(cred_id_to_save, bytes):
        # credential_id を base64url 形式に変換して保存する
        cred_id_to_save = bytes_to_base64url(cred_id_to_save)

    # 新規登録時にユーザーの認証済みステータスを更新するフラグがある場合のみ処理
    if update_user_verification:
        # 新規登録時にユーザーのメール検証ステータスを更新する場合
        # ユーザーのメール検証ステータスを更新する
        UserService.update_user_email_verification(db, user_id)

    # WebAuthn資格情報をデータベースに保存する
    WebAuthnService.register_credential(
        db=db,
        user_id=user_id,
        credential_id_str=cred_id_to_save,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        device_name=device_name,
    )

    # 検証完了のみ通知し、レスポンス本文は返さない
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _issue_registration_options(request: Request, db: Session):
    """
    セッショントークンからユーザーを特定し、WebAuthn登録用オプションを作成・返却します。

    Args:
        request (Request): クライアントからのリクエスト
        db (Session): データベースセッション

    Returns:
        dict: WebAuthnの `generate_registration_options` を処理した結果
    """
    session_token = request.cookies.get(settings.WEB_AUTHN_TEMP_TOKEN_NAME)
    if not session_token:
        logger.error("Session token missing in request cookies")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Session token missing"
        )

    user_id = validate_token(db, session_token)
    if not user_id:
        logger.error("Invalid or expired session token")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired session",
        )

    user = UserService.read_user(db=db, user_id=user_id)
    if not user:
        # ここでユーザーが見つからない場合は、セッションが不正である可能性が高い
        logger.error("User not found for user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # WebAuthn登録オプションを生成
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
    # challenge を session_token と紐付けて保存
    save_challenge(db, session_token, options.challenge)
    return json.loads(options_to_json(options))


@router.options("/register/options")
async def options_register_options():
    """
    登録オプション取得用のOPTIONSメソッド。
    CORS設定などのために必要です。
    """
    return {}


@router.post(
    "/register/options",
)
def register_options(request: Request, db: Session = Depends(get_db)):
    """
    新規ユーザーまたは既存ユーザーのWebAuthn登録用オプションを生成します。
    セッションクッキーからユーザーを特定し、チャレンジを含む登録情報を返します。
    """
    logger.debug("register_options request received")
    return _issue_registration_options(request, db)


@router.options("/register/verify")
async def options_register_verify():
    """
    登録検証用OPTIONSメソッド。
    """
    return {}


@router.post("/register/verify", status_code=status.HTTP_204_NO_CONTENT)
def register_verify(
    payload: dict, request: Request, db: Session = Depends(get_db)
) -> Response:
    """
    WebAuthnの登録プロセスにおける検証レスポンスを受け取り、
    正当性を確認した上で新しいデバイスをユーザーに紐付けます。
    成功時には204 No Contentを返します。
    """
    logger.debug("register_verify request received")
    return _verify_registration_and_store(
        payload=payload,
        request=request,
        db=db,
        update_user_verification=True,
    )


@router.options("/devices/register/options")
async def options_device_register_options():
    """
    追加デバイス登録用のOPTIONSメソッド。
    """
    return {}


@router.post("/devices/register/options")
def device_register_options(request: Request, db: Session = Depends(get_db)):
    """
    追加デバイス登録専用のオプション発行API。
    """
    logger.debug("device_register_options request received")
    return _issue_registration_options(request, db)


@router.options("/devices/register/verify")
async def options_device_register_verify():
    """
    追加デバイス登録用の検証用OPTIONSメソッド。
    """
    return {}


@router.post("/devices/register/verify", status_code=status.HTTP_204_NO_CONTENT)
def device_register_verify(
    payload: dict, request: Request, db: Session = Depends(get_db)
) -> Response:
    """
    追加デバイス登録専用の検証API。
    ユーザーステータスは更新しない。
    """
    logger.debug("device_register_verify request received")
    return _verify_registration_and_store(
        payload=payload,
        request=request,
        db=db,
        update_user_verification=False,
    )


# ----------------------------
# Login
# ----------------------------
@router.options("/login/options")
async def options_login_options():
    """
    ログイン用のWebAuthnオプション取得用OPTIONSメソッド。
    """
    return {}


@router.post("/login/options", response_model=LoginOptionsResponse)
def login_options(
    request: Request, db: Session = Depends(get_db)
) -> LoginOptionsResponse:
    """
    ログイン用のWebAuthnオプションを生成し、クライアントに返します。

    Args:
        request (Request): クライアントからのリクエスト
        db (Session): データベースセッション

    Returns:
        LoginOptionsResponse: WebAuthnの認証オプションとセッショントークン
    """
    # ログイン用のWebAuthn認証オプションを発行する。
    options = generate_authentication_options(
        rp_id=settings.WEB_AUTHN_RP_ID,
        allow_credentials=[],
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    # challenge を session_token と紐付けて保存
    #  ※ ここでは、セッションを新規に作成するため、既存のセッションがあっても無視して新しいトークンを発行する。
    session_token = SessionService.get_or_create_temp_token()
    AuthOptionsService.save_auth_challenge(
        db=db,
        session_token=session_token,
        challenge=options.challenge,
    )

    return LoginOptionsResponse(
        options=json.loads(options_to_json(options)),
        session_token=session_token,
    )


@router.post("/login/verify", status_code=status.HTTP_204_NO_CONTENT)
def login_verify(
    payload: dict, response: Response, db: Session = Depends(get_db)
) -> Response:
    """
    WebAuthnのログイン検証レスポンスを受け取り、正当性を確認した上でユーザーを認証します。
    成功時には204 No Contentを返します。

    Args:
        payload (dict): フロントエンドから送信されたWebAuthnの応答データ
        response (Response): レスポンスオブジェクト
        db (Session): データベースセッション

    Returns:
        Response: 成功時に204 No Contentを返すレスポンス
    """
    # payload["id"] は credential_id を指すと想定
    logger.debug(
        "login_verify request received for credential_id: %s", payload.get("id")
    )
    session_token = payload.get(settings.WEB_AUTHN_TEMP_TOKEN_NAME)
    credential_id = payload.get(
        "id"
    )  # frontから送られてくるのは "id" フィールドであること

    # 1. credential_id から credential を逆引き
    cred = WebAuthnService.get_by_credential_id(db, credential_id)
    if not cred:
        logger.debug("Unknown credential id=%s", credential_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown credential"
        )

    # 2. session_token から challenge を取得
    challenge = AuthOptionsService.get_auth_challenge(
        db=db,
        session_token=session_token,
    )
    if not challenge:
        logger.debug("No challenge found for session_token=%s", session_token)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No challenge found for the provided session token",
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
        key=settings.SESSION_COOKIE_NAME,
        value=str(session.id),
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )

    # Cookie を設定した同一レスポンスを 204 として返す
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post("/logout")
def logout(response: Response):
    """
    セッションクッキーを削除する。
    """
    response.delete_cookie(settings.SESSION_COOKIE_NAME)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
