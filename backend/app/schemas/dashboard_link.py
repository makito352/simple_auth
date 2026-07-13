"""
ダッシュボードリンク関連のスキーマを定義するモジュール。
このモジュールでは、ダッシュボードリンクの作成、取得、更新のデータ構造を定義します。
"""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DashboardLinkBase(BaseModel):
    """
    ダッシュボードリンクの共通ベースモデル。
    """

    title: str = Field(..., description="表示名")
    url: str = Field(..., description="アクセス先URL")
    icon_path: Optional[str] = Field(None, description="アイコンのパス")
    order_index: int = Field(default=0, description="並び順")


class DashboardLinkCreate(DashboardLinkBase):
    """
    ダッシュボードリンク作成用の入力スキーマ。
    """

    pass


class DashboardLinkRead(DashboardLinkBase):
    """
    ダッシュボードリンク取得用の出力スキーマ。
    """

    id: UUID

    class Config:
        from_attributes = True
