"""
ユーザー関連のAPIエンドポイントを提供するモジュール。
このモジュールでは、ユーザーの作成、取得、更新、削除の処理を行います。
"""

from uuid import UUID

from app.core.config import logger
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.session_service import SessionService
from app.services.user_service import UserService
from app.core.config import settings
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/users", tags=["users"])


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Cookieのsession_idを読み取り、データベースから対応するUserオブジェクトを取得します。
    """
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_id:
        logger.debug("認証エラー: cookie '%s' が存在しません。", settings.SESSION_COOKIE_NAME)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    session = SessionService.validate_session(db, session_id)
    if session is None:
        logger.debug(
            "認証エラー: セッションID %s が無効または期限切れです。", session_id
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )
    user = UserService.read_user(db, user_id=session.user_id)
    if not user:
        logger.debug(
            "認証エラー: セッションは存在しますが、対応するユーザーが見つかりません。セッションID: %s", session_id
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    管理者権限を持つユーザーのみを許可する。
    """
    if current_user.role != "admin":
        logger.warning("認証エラー: 管理者権限が必要です。ユーザーID: %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )
    return current_user


# --- GET: ユーザー一覧の取得 (管理者のみ) ---
@router.get("/", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db), _admin: User = Depends(get_current_admin_user)
):
    """
    全ユーザーのリストを取得します（管理者のみ）。
    """
    return UserService.get_all_users(db)


# --- GET: ユーザー情報の取得 ---
@router.get("/me", response_model=UserOut)
def get_user(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    現在ログインしているユーザーの情報を取得します。
    """
    return current_user


# --- POST: ユーザーの作成 (管理者のみ) ---
@router.post("/", status_code=status.HTTP_201_CREATED, response_model=UserOut)
def create_user(
    user_in: UserCreate,  # スキーマを適用
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    """
    新しくユーザーを作成します（管理者のみ実施可能）。
    """
    return UserService.create_user(db, email=user_in.email, role=user_in.role)


# --- PUT: ユーザー情報の更新 (管理者のみ) ---
@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: UUID,
    user_in: UserUpdate,  # スキーマを適用
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    """
    ユーザー情報を更新します（管理者のみ）。
    """
    update_data = user_in.model_dump(exclude_unset=True)
    return UserService.update_user(db, user_id, **update_data)


# --- DELETE: ユーザーの削除 (管理者のみ) ---
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    """
    ユーザーを削除します（管理者のみ）。
    """
    UserService.delete_user(db, user_id)
    return None
