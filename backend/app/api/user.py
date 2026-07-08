"""
ユーザー関連のAPIエンドポイントを提供するモジュール。
このモジュールでは、ユーザーの作成、取得、更新、削除の処理を行います。
"""

from uuid import UUID

from app.api.current_user import get_current_admin_user, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.user_service import UserService
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/users", tags=["users"])


# --- GET: ユーザー一覧の取得 (管理者のみ) ---
@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _admin=Depends(get_current_admin_user)):
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
    _admin=Depends(get_current_admin_user),
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
    _admin=Depends(get_current_admin_user),
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
    _admin=Depends(get_current_admin_user),
):
    """
    ユーザーを削除します（管理者のみ）。
    """
    UserService.delete_user(db, user_id)
    return None
