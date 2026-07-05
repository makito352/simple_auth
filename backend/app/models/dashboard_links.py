"""
ダッシュボードリンクの設定を管理するモデル。
"""

import uuid

from app.db.session import Base
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class DashboardLink(Base):
    """
    システムが提供するダッシュボードのリンク情報を保持します。
    """

    __tablename__ = "dashboard_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # title: 表示名
    title = Column(String, nullable=False, comment="表示名")
    # url: アクセス先URL
    url = Column(String, nullable=False, comment="アクセス先URL")
    # icon_path: アイコンのパス
    icon_path = Column(String, comment="アイコンのパス")
    # order_index: 並び順 (デフォルト値0はSQL側で設定済みのため、モデル上ではnullableを考慮するか省略できますが、明示します)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<DashboardLink(title='{self.title}', url='{self.url}')>"
