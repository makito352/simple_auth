"""
DashboardLinkServiceモジュールは、ダッシュボードのリンク情報を管理するためのサービスクラスを提供します。
このサービスは、CRUD操作（作成、読み取り、更新、削除）およびデータの取得ロジックを提供し、
データベースとのやり取りを抽象化します。
"""

from typing import List, Optional
from uuid import UUID

from app.core.config import logger
from app.models.dashboard_links import DashboardLink
from sqlalchemy.orm import Session


class DashboardLinkService:
    """
    ダッシュボードのリンク情報を管理するサービス。
    CRUD操作およびデータの取得ロジックを提供します。
    """

    @staticmethod
    def list_all(db: Session, skip: int = 0, limit: int = 100) -> List[DashboardLink]:
        """
        ダッシュボードのリンク一覧を取得します。
        """
        try:
            # 並び順を order_index の昇順で指定
            return (
                db.query(DashboardLink)
                .order_by(DashboardLink.order_index)
                .offset(skip)
                .limit(limit)
                .all()
            )
        except Exception as e:
            logger.error(f"Error fetching all dashboard links: {e}")
            raise

    @staticmethod
    def get_by_id(db: Session, link_id: UUID) -> Optional[DashboardLink]:
        """
        IDを指定して特定のダッシュボードリンクを取得します。
        """
        try:
            return db.query(DashboardLink).filter(DashboardLink.id == link_id).first()
        except Exception as e:
            logger.error(f"Error fetching dashboard link with ID {link_id}: {e}")
            raise

    @staticmethod
    def create(
        db: Session,
        title: str,
        url: str,
        order_index: int = 0,
        icon_path: Optional[str] = None,
    ) -> DashboardLink:
        """
        新しいダッシュボードリンクを作成します。

        Args:
            db: SQLAlchemyのセッション
            title: 表示名
            url: アクセス先URL
            order_index: 並び順
            icon_path: アイコンのパス
        """
        try:
            new_link = DashboardLink(
                title=title,
                url=url,
                order_index=order_index,
                icon_path=icon_path,
            )
            db.add(new_link)
            db.commit()
            db.refresh(new_link)
            return new_link
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create dashboard link: {e}")
            raise

    @staticmethod
    def update(
        db: Session,
        link_id: UUID,
        title: str,
        url: str,
        order_index: Optional[int] = None,
        icon_path: Optional[str] = None,
    ) -> Optional[DashboardLink]:
        """
        既存のダッシュボードリンクを更新します。
        """
        try:
            link = db.query(DashboardLink).filter(DashboardLink.id == link_id).first()
            if not link:
                logger.debug("Dashboard link not found for link_id=%s", link_id)
                return None

            link.title = title
            link.url = url
            if order_index is not None:
                link.order_index = order_index
            if icon_path is not None:
                link.icon_path = icon_path

            db.commit()
            db.refresh(link)
            return link
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to update dashboard link {link_id}: {e}")
            raise

    @staticmethod
    def delete(db: Session, link_id: UUID) -> bool:
        """
        ダッシュボードリンクを削除します。
        """
        try:
            link = db.query(DashboardLink).filter(DashboardLink.id == link_id).first()
            if not link:
                logger.debug("Dashboard link not found for link_id=%s", link_id)
                return False

            db.delete(link)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to delete dashboard link {link_id}: {e}")
            raise
