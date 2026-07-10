"""
ワンタイムリンク（単発利用用リンク）に関するエンドポイントを定義する。

このモジュールは、デバイス登録や特定の操作において一時的なトークンを発行し、
それを検証してユーザーの認証状態を更新するためのAPIを提供します。
"""

from app.api.current_user import get_current_admin_user, get_current_user
from app.core.config import logger, settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.one_time_link import (
    CreateLinkRequest,
    GetLinkRequest,
    OneTimeLinkCreateResponse,
    OneTimeLinkGetResponse,
    TokenVerificationResponse,
)
from app.services.one_time_link_service import (
    IntegrityError,
    LinkValidationError,
    OneTimeLinkService,
)
from app.services.registration_session_service import generate_token
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth/one-time-link", tags=["OneTimeLink"])


@router.options("/create")
async def options_create_one_time_link():
    return {}


@router.post("/create", response_model=OneTimeLinkCreateResponse)
def create_one_time_link(
    data: CreateLinkRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
) -> OneTimeLinkCreateResponse:
    """
    【管理用】新しいワンタイムリンクを作成し、トークンを返します。
    例: 管理画面から特定のユーザーに対して「登録用URL」を発行する際に使用。
    有効期限は設定値（通常60分）、用途は registration に固定する。
    """
    # 同用途の未使用リンクが残っていれば再利用し、同時多発行を避ける。
    existing_link = OneTimeLinkService.get_link_by_user_id(
        db,
        user_id=data.user_id,
        link_type="registration",
    )
    if existing_link is not None:
        logger.debug("Reusing existing one-time link for user_id=%s", data.user_id)
        return existing_link

    return OneTimeLinkService.create_link(
        db,
        user_id=data.user_id,
        link_type="registration",
        expires_in_minutes=settings.ONE_TIME_LINK_EXPIRE_MINUTES,
    )


@router.post("/create/rereg", response_model=OneTimeLinkCreateResponse)
def create_rereg_one_time_link(
    data: CreateLinkRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
) -> OneTimeLinkCreateResponse:
    """
    【管理用】新しいワンタイムリンクを作成し、トークンを返します。
    例: 管理画面から特定のユーザーに対して「ディバイス追加用URL」を発行する際に使用。
    有効期限は設定値（通常60分）、用途は device_registration に固定する。
    """
    # 同用途の未使用リンクが残っていれば再利用し、同時多発行を避ける。
    existing_link = OneTimeLinkService.get_link_by_user_id(
        db,
        user_id=data.user_id,
        link_type="device_registration",
    )
    if existing_link is not None:
        logger.debug("Reusing existing one-time link for user_id=%s", data.user_id)
        return existing_link

    return OneTimeLinkService.create_link(
        db,
        user_id=data.user_id,
        link_type="device_registration",
        expires_in_minutes=settings.ONE_TIME_LINK_EXPIRE_MINUTES,
    )


@router.get("/get-by-user-id", response_model=OneTimeLinkGetResponse)
def get_one_time_link_by_user_id(
    data: GetLinkRequest = Depends(),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
) -> OneTimeLinkGetResponse:
    """
    【管理用】指定されたユーザーIDに関連付けられたワンタイムリンクを取得します。
    既存の有効なリンクがある場合はそれを返し、ない場合はNone（または404）を扱うためのエンドポイントです。
    """
    link_data = OneTimeLinkService.get_link_by_user_id(
        db,
        user_id=data.user_id,
        link_type=data.link_type,
    )
    if link_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="該当する有効なワンタイムリンクが見つかりません。",
        )
    return OneTimeLinkGetResponse(
        token=link_data.token,
        url=link_data.url,
        expires_at=link_data.expires_at,
        message=link_data.message,
        link_type=data.link_type,
    )


@router.post("/create/self", response_model=OneTimeLinkCreateResponse)
def create_self_device_link(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OneTimeLinkCreateResponse:
    """
    ログイン中ユーザー自身の追加デバイス登録用リンクを発行する。
    有効期限は設定値（通常5分）、用途は device_registration に固定する。
    """
    user_id = current_user.id

    # 同用途の未使用リンクが残っていれば再利用し、同時多発行を避ける。
    existing_link = OneTimeLinkService.get_link_by_user_id(
        db,
        user_id,
        link_type="device_registration",
    )
    if existing_link is not None:
        logger.debug("Reusing existing one-time link for user_id=%s", user_id)
        return existing_link

    logger.debug("Creating new one-time link for user_id=%s", user_id)
    return OneTimeLinkService.create_link(
        db,
        user_id=user_id,
        link_type="device_registration",
        expires_in_minutes=settings.DEVICE_REGISTRATION_LINK_EXPIRE_MINUTES,
    )


@router.get("/verify", response_model=TokenVerificationResponse)
def verify_one_time_link(
    token: str, db: Session = Depends(get_db), response: Response = None
) -> TokenVerificationResponse:
    """
    トークンを検証し、消費します。
    ユーザーがメール等のリンクをクリックした際に呼び出されます。
    成功した場合、そのユーザーの情報を返します。
    """
    try:
        # サービス層で「有効性チェック」と「使用済みフラグへの更新」を同時に行う
        user = OneTimeLinkService.verify_and_consume_link(db, token)
        # WebAuthn用の一時的なセッションを作成し、クッキーにセットする
        # これにより、次の /webauthn/ ステップでこのユーザーを識別できるようになります。
        registration_token = generate_token(db, user.id)
        response.set_cookie(
            key=settings.WEB_AUTHN_TEMP_TOKEN_NAME,
            value=registration_token,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/",
        )
        logger.debug("One-time link verified and consumed for user_id=%s", user.id)
        return TokenVerificationResponse(
            user_id=str(user.id),
            email=user.email,
            status=user.email_verification_status,
        )
    except LinkValidationError as e:
        # verify_and_consume_linkでwarnやerrorを出力しているため、ここではログ出力は控える
        logger.debug("One-time link verification failed (Client Error): %s", str(e))
        # ユーザーの操作ミスに関連するものは、そのまま400で返す
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except IntegrityError:
        # システム側の不備や想定外のデータ状態は、500として汎用メッセージを出す
        logger.error("One-time link verification failed (System/Integrity Error)")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="システムエラーが発生しました。再度お試しください。",
        )
