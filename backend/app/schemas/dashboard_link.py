from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


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
    # created_at を含める場合はここに追加

    class Config:
        from_attributes = True
