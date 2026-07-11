"""
初期管理者のための専用認証エンドポイントを定義する。
"""

from app.core.config import settings
from app.db.session import get_db
from app.schemas.auth import InitialAdminLoginRequest, InitialAdminLoginResponse
from app.services.registration_session_service import generate_token
from app.services.user_service import UserService
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth/init-admin", tags=["initial-admin"])


@router.get("/status", status_code=status.HTTP_204_NO_CONTENT)
def get_initial_setup_status(db: Session = Depends(get_db)):
    """
    初期設定が必要かどうかを判定する。
    必要であれば True を返す。
    """
    try:
        is_required = UserService.is_initial_setup_required(db)
        if is_required:
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        else:
            # 初期設定が不要な場合は 404 Not Found を返す
            return Response(status_code=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/login", response_model=InitialAdminLoginResponse)
def login_initial_admin(
    data: InitialAdminLoginRequest,
    db: Session = Depends(get_db),
    response: Response = None,
) -> InitialAdminLoginResponse:
    """
    初期管理者（システム起動直後のセットアップ用）のログイン。
    認証に成功した場合、クッキーにセッショントークンをセットします。
    """
    try:
        # UserService.initial_admin_login を使用して検証
        user = UserService.initial_admin_login(db, data.email, data.password)

        # 認証に成功した場合、one_time_linkと同じセッションクッキーを設定する
        # WebAuthn用の一時的なセッションを作成し、クッキーにセットする
        # これにより、次の /webauthn/ ステップでこのユーザーを識別できるようになります。
        session_token = generate_token(db, user.id)
        response.set_cookie(
            key=settings.WEB_AUTHN_TEMP_TOKEN_NAME,
            value=session_token,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/",
        )

        return InitialAdminLoginResponse(
            user_id=str(user.id),
            email=user.email,
            status=user.email_verification_status,
        )
    except ValueError as e:
        # UserServiceで投げられるエラーは、認証失敗として404を返す
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
