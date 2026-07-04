from app.db.session import get_db
from app.schemas.one_time_link import (CreateLinkRequest,
                                       OneTimeLinkCreateResponse,
                                       TokenVerificationResponse)
from app.services.one_time_link_service import OneTimeLinkService
from app.services.registration_session_service import generate_token
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth/one-time-link", tags=["OneTimeLink"])


@router.options("/create")
async def options_create_one_time_link():
    return {}


@router.post("/create", response_model=dict)
def create_one_time_link(
    data: CreateLinkRequest, db: Session = Depends(get_db)
) -> OneTimeLinkCreateResponse:
    """
    【管理用】新しいワンタイムリンクを作成し、トークンを返します。
    例: 管理画面から特定のユーザーに対して「登録用URL」を発行する際に使用。
    """
    try:
        link = OneTimeLinkService.create_link(
            db, user_id=data.user_id, link_type=data.link_type
        )
        return OneTimeLinkCreateResponse(
            token=link.token,
            expires_at=link.expires_at.isoformat(),  # datetimeを文字列に変換
            message="Link created successfully",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create link: {str(e)}",
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
