"""
dashboard_links API モジュール

ダッシュボードリンクの CRUD 操作と、アイコンファイルの保存／削除処理を提供します。
"""

from typing import Optional

from app.api.current_user import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.schemas.dashboard_link import DashboardLinkRead
from app.services.dashboard_links_service import DashboardLinkService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


def _build_icon_url(icon_path: Optional[str]) -> Optional[str]:
    """保存済みアイコンの相対パスを絶対 URL に変換する。"""

    if not icon_path:
        return None

    # 既に完全な URL で指定されている場合はそのまま返す
    if icon_path.startswith("http://") or icon_path.startswith("https://"):
        return icon_path

    # フロント用の URL を構築する
    base_uri = str(settings.BACKEND_BASE_URI).rstrip("/")
    relative_path = icon_path.lstrip("/")

    return f"{base_uri}/{relative_path}"


def serialize_dashboard_link(link) -> DashboardLinkRead:
    """データベースモデルから API レスポンス用のスキーマに変換する。"""
    return DashboardLinkRead(
        id=link.id,
        title=link.title,
        url=link.url,
        icon_path=_build_icon_url(link.icon_path),
        order_index=link.order_index,
    )


@router.get("/", response_model=list[DashboardLinkRead])
def list_links(
    db: Session = Depends(get_db), _get_current_user=Depends(get_current_user)
):
    """登録済みのダッシュボードリンク一覧を取得する。"""

    # DB からすべてのリンクを取得し、レスポンス用にシリアライズする
    links = DashboardLinkService.list_all(db)
    return [serialize_dashboard_link(link) for link in links]
