from time import perf_counter

from app.core.config import logger
from app.utils.request_utils import resolve_client_ip, resolve_request_user_id

from fastapi import Request

async def access_log_middleware(request: Request, call_next):
    """
    アクセス主体を含むアプリケーション側のアクセスログを出力する。
    """
    request_path = request.scope.get("path", "")
    if request_path == "/health":
        return await call_next(request)

    root_path = request.scope.get("root_path", "")
    full_path = f"{root_path}{request_path}"
    client_ip = resolve_client_ip(request)
    started_at = perf_counter()
    user_id = resolve_request_user_id(request)
    authenticated = user_id is not None

    request.state.current_user_id = user_id
    request.state.authenticated = authenticated

    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception:
        raise
    finally:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.info(
            "access authenticated=%s user_id=%s method=%s path=%s status_code=%s client_ip=%s duration_ms=%s",
            authenticated,
            user_id,
            request.method,
            full_path,
            status_code,
            client_ip,
            duration_ms,
        )

            request.method,
            full_path,
            status_code,
            client_ip,
            duration_ms,
        )