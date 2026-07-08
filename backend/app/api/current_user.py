"""
カレントユーザーを取得するための依存関数を提供します。
"""

from app.core.config import logger, settings
from app.db.session import get_db
from app.models.user import User
from app.services.session_service import SessionService
from app.services.user_service import UserService
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Cookieのsession_idを読み取り、データベースから対応するUserオブジェクトを取得します。
    """
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_id:
        logger.debug(
            "認証エラー: cookie '%s' が存在しません。", settings.SESSION_COOKIE_NAME
        )
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
            "認証エラー: セッションは存在しますが、対応するユーザーが見つかりません。セッションID: %s",
            session_id,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> bool:
    """
    管理者権限を持つユーザーのみを許可する。
    """
    if current_user.role != "admin":
        logger.warning(
            "認証エラー: 管理者権限が必要です。ユーザーID: %s", current_user.id
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )
    return True
