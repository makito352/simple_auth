"""
ヘルスチェックのレスポンス構造を定義するスキーマモジュール。
"""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """
    ヘルスチェックのレスポンス構造を定義。
    """

    status: str
