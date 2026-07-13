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

    # セッションが有効な場合、対応するユーザーを取得
    try:
        user = UserService.read_user(db, user_id=session.user_id)
    except ValueError as exc:
        # read_user がユーザーを見つけられなかった場合に ValueError をスローため、ここでキャッチして 401 エラーを返す
        # セッションIDに対応するユーザーが見つからない場合のエラーハンドリング
        logger.debug(
            "認証エラー: セッションID %s に対応するユーザーの取得に失敗しました。理由: %s",
            session_id,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        ) from exc

    request.state.current_user_id = str(user.id)
    request.state.authenticated = True
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
