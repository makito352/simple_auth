"""
ヘルスチェックのレスポンス構造を定義するスキーマモジュール。
"""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """
    ヘルスチェックのレスポンス構造を定義。
    """

    status: str = Field(..., description="サービスの稼働状態")
