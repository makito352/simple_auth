"""
【一般ユーザ向け】
ユーザー関連のAPIエンドポイントを提供するモジュール。
このモジュールでは、ユーザーの作成、取得、更新、削除の処理を行います。
"""

from app.api.current_user import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserOut
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

router = APIRouter(prefix="/users", tags=["users"])


# --- GET: ユーザー情報の取得 ---
@router.get("/me", response_model=UserOut)
def get_user(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    【一般ユーザー向け】
    現在ログインしているユーザーの情報を取得します。
    """
    return current_user
