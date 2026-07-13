"""
ヘルスチェック用のエンドポイントを定義するモジュール。
システムの稼働状況を確認するためのAPIを提供します。
"""

from app.schemas.health import HealthResponse
from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """
    システムのヘルスチェックを実行し、現在の状態を返します。

    Returns:
        HealthResponse: ステータスを示すレスポンスオブジェクト。
    """
    # 正常に動作している場合に "ok" を返す
    return HealthResponse(status="ok")
