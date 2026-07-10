"""
リクエストの処理過程をログに記録するためのミドルウェア。
"""

from time import perf_counter

from app.core.config import logger
from app.utils.request_utils import resolve_client_ip
from fastapi import Request


async def access_log_middleware(request: Request, call_next):
    """
    アクセス主体を含むアプリケーション側のアクセスログを出力する。
    """
    request_path = request.scope.get("path", "")
    # ヘルスチェックパスはログ出力の対象外とする
    if request_path == "/health":
        return await call_next(request)

    client_ip = resolve_client_ip(request)
    started_at = perf_counter()

    # リクエスト開始時点では認証状態は未確定のため、後続の依存解決に委ねる
    request.state.current_user_id = None
    request.state.authenticated = False

    status_code = 500
    try:
        # 次のハンドラを実行
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception:
        # 例外発生時も後続のfinallyブロックでログを記録
        raise
    finally:
        # 処理時間をミリ秒単位で計算
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        user_id = getattr(request.state, "current_user_id", None)
        authenticated = getattr(request.state, "authenticated", False)
        # ログ出力
        logger.info(
            "access authenticated=%s user_id=%s method=%s path=%s status_code=%s client_ip=%s duration_ms=%s",
            authenticated,
            user_id,
            request.method,
            request.url.path,
            status_code,
            client_ip,
            duration_ms,
        )
