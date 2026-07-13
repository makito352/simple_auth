"""
このモジュールは FastAPI アプリケーションで使用される共通の例外ハンドラを定義します。
"""

from app.core.config import logger
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError


def internal_server_error_handler(request: Request, exc: Exception):
    """
    全リクエストに対する 500 エラーの共通ハンドラ。
    """
    logger.error(
        "Internal Server Error: %s",
        str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": "Internal server error"},
    )


def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    バリデーションエラー（Pydantic等）が発生した際の共通ハンドラ。
    """
    logger.warning("Validation error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    データベース操作に関連するエラーのハンドラ。
    """
    logger.error("Database error occurred: %s", str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Database operation failed"},
    )
