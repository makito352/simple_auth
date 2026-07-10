"""
このモジュールは、プロキシサーバーへの認証リクエストを処理するためのエンドポイントを提供します。
CookieからセッションIDを取得し、検証した上でユーザー情報を特定し、
Nginxなどのリバースプロキシに渡すためのヘッダーをセットします。
"""

from app.api.current_user import get_current_user
from app.models.user import User
from fastapi import APIRouter, Depends, Response, status

router = APIRouter(prefix="/proxy", tags=["proxy"])


@router.get(
    "/auth-request", response_class=Response, status_code=status.HTTP_204_NO_CONTENT
)
def auth_request(response: Response, user: User = Depends(get_current_user)):
    """
    認証リクエストを処理し、有効なセッションがある場合にユーザー情報をセットします。

    Args:
        response (Response): FastAPIのResponseオブジェクト。ヘッダーを書き換えます。
        user (User): 現在の認証済みユーザー。

    Returns:
        Response: 成功時に204 No Contentを返します。

    Raises:
        HTTPException: セッションがない、または無効な場合に401エラーを返します。
    """
    # nginxなどのプロキシサーバーが参照するカスタムヘッダにユーザーのメールアドレスを設定
    response.headers["X-User"] = user.email

    # 認証成功時、レスポンスボディなしの204 No Contentを返す
    return Response(status_code=status.HTTP_204_NO_CONTENT)
