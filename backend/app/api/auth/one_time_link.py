from app.db.session import get_db
from app.schemas.one_time_link import (CreateLinkRequest,
                                       OneTimeLinkCreateResponse,
                                       TokenVerificationResponse)
from app.services.one_time_link_service import OneTimeLinkService
from app.services.registration_session_service import generate_token
from app.services.session_service import SessionService
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from uuid import UUID

router = APIRouter(prefix="/auth/one-time-link", tags=["OneTimeLink"])


def get_current_user_id(request: Request, db: Session) -> UUID:
    """
    セッションクッキーから現在ログイン中のユーザーIDを取得する。
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


@router.options("/create")
async def options_create_one_time_link():
    return {}


@router.post("/create", response_model=OneTimeLinkCreateResponse)
def create_one_time_link(
    data: CreateLinkRequest, db: Session = Depends(get_db)
) -> OneTimeLinkCreateResponse:
    """
    【管理用】新しいワンタイムリンクを作成し、トークンを返します。
    例: 管理画面から特定のユーザーに対して「登録用URL」を発行する際に使用。
    """
    try:
        return OneTimeLinkService.create_link(
            db,
            user_id=data.user_id,
            link_type=data.link_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create link: {str(e)}",
        )


@router.post("/create/self", response_model=OneTimeLinkCreateResponse)
def create_self_device_link(
    request: Request,
    db: Session = Depends(get_db),
) -> OneTimeLinkCreateResponse:
    """
    ログイン中ユーザー自身の追加デバイス登録用リンクを発行する。
    有効期限は5分、用途は device_registration に固定する。
    """
    user_id = get_current_user_id(request, db)

    # 同用途の未使用リンクが残っていれば再利用し、同時多発行を避ける。
    existing_link = OneTimeLinkService.get_link_by_user_id(
        db,
        user_id,
        link_type="device_registration",
    )
    if existing_link is not None:
        return existing_link

    return OneTimeLinkService.create_link(
        db,
        user_id=user_id,
        link_type="device_registration",
        expires_in_minutes=5,
    )


@router.get("/verify", response_model=TokenVerificationResponse)
def verify_one_time_link(
    token: str, db: Session = Depends(get_db), response: Response = None
) -> TokenVerificationResponse:
    """
    【フロントエンド用】トークンを検証し、消費します。
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
            key="session_token",
            value=registration_token,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/",
        )
        return TokenVerificationResponse(
            user_id=str(user.id),
            email=user.email,
            status=user.email_verification_status,
        )
    except ValueError as e:
        # 期限切れ、または不正なトークンの場合は400 Bad Requestを返す
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during link verification.",
        )
