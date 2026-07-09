"""
【管理者向け】
dashboard_links API モジュール

ダッシュボードリンクの CRUD 操作と、アイコンファイルの保存／削除処理を提供します。
"""

import os
import uuid
from pathlib import Path
from typing import Optional
from uuid import UUID

from app.api.current_user import get_current_admin_user
from app.core.config import logger, settings
from app.db.session import get_db
from app.schemas.dashboard_link import DashboardLinkCreate, DashboardLinkRead
from app.services.dashboard_links_service import DashboardLinkService
from app.utils.static_utils import ICON_URL_PREFIX, get_static_icons_dir
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from PIL import Image, ImageOps
from sqlalchemy.orm import Session

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


def _save_icon_file(file: UploadFile) -> str:
    """アップロードされたアイコンファイルを保存して、URL パスを返す。"""

    # アイコン保存先のディレクトリを準備する
    icons_dir = get_static_icons_dir()
    os.makedirs(icons_dir, exist_ok=True)

    # 元ファイル名から拡張子を取得し、UUID で一意なファイル名を生成する
    original_extension = Path(file.filename).suffix.lower()
    if original_extension not in {".png", ".jpg", ".jpeg", ".webp", ".bmp"}:
        original_extension = ".png"
    unique_filename = f"{uuid.uuid4()}{original_extension}"
    full_path = os.path.join(icons_dir, unique_filename)

    try:
        file.file.seek(0)
        image = Image.open(file.file)
        image = ImageOps.exif_transpose(image)
        image.thumbnail((64, 64), Image.LANCZOS)

        # 64x64 に収まるように余白で埋めて正方形にする
        if image.mode not in {"RGBA", "RGB"}:
            image = image.convert("RGBA")
        canvas = Image.new("RGBA", (64, 64), (255, 255, 255, 0))
        offset_x = (64 - image.width) // 2
        offset_y = (64 - image.height) // 2
        canvas.paste(
            image, (offset_x, offset_y), image if image.mode == "RGBA" else None
        )

        save_format = {
            ".png": "PNG",
            ".jpg": "JPEG",
            ".jpeg": "JPEG",
            ".webp": "WEBP",
            ".bmp": "BMP",
        }[original_extension]

        if save_format == "JPEG":
            canvas = canvas.convert("RGB")

        canvas.save(full_path, format=save_format, quality=85)
    except Exception:
        logger.warning(
            "Failed to resize icon image, saving original upload instead", exc_info=True
        )
        file.file.seek(0)
        with open(full_path, "wb") as buffer:
            buffer.write(file.file.read())

    logger.debug("full_path:%s", full_path)

    # フロントエンドからアクセスできる相対 URL パスを返す
    return f"{ICON_URL_PREFIX}/{unique_filename}"


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


def _serialize_dashboard_link(link) -> DashboardLinkRead:
    """データベースモデルから API レスポンス用のスキーマに変換する。"""
    return DashboardLinkRead(
        id=link.id,
        title=link.title,
        url=link.url,
        icon_path=_build_icon_url(link.icon_path),
        order_index=link.order_index,
    )


def _delete_icon_file(icon_path: str) -> None:
    """指定されたアイコンパスが存在する場合、そのファイルを削除する。"""

    if not icon_path:
        return

    file_name = os.path.basename(icon_path)
    file_path = os.path.join(get_static_icons_dir(), file_name)

    # ファイルが存在すれば削除する。削除失敗時は無視して処理を継続する。
    if os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass


@router.get("/", response_model=list[DashboardLinkRead])
def list_links(db: Session = Depends(get_db), _admin=Depends(get_current_admin_user)):
    """登録済みのダッシュボードリンク一覧を取得する。"""

    # DB からすべてのリンクを取得し、レスポンス用にシリアライズする
    links = DashboardLinkService.list_all(db)
    return [_serialize_dashboard_link(link) for link in links]


@router.post("/", response_model=DashboardLinkRead, status_code=status.HTTP_201_CREATED)
def create_link(
    title: str = Form(...),
    url: str = Form(...),
    order_index: int = Form(0),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """新しいダッシュボードリンクを作成する。"""

    # フォームから受け取った値をスキーマで検証する
    payload = DashboardLinkCreate(title=title, url=url, order_index=order_index)
    icon_path = _save_icon_file(file) if file else None

    new_link = DashboardLinkService.create(
        db,
        title=payload.title,
        url=payload.url,
        order_index=payload.order_index,
        icon_path=icon_path,
    )
    return _serialize_dashboard_link(new_link)


@router.put("/{link_id}", response_model=DashboardLinkRead)
def update_link(
    link_id: UUID,
    title: str = Form(...),
    url: str = Form(...),
    order_index: Optional[int] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """既存のダッシュボードリンクを更新する。"""
    icon_path = None

    # 対象リンクが存在するか確認する
    existing_link = DashboardLinkService.get_by_id(db, link_id)
    if not existing_link:
        logger.debug("Dashboard link not found for link_id=%s", link_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard link not found")

    # ファイルがアップロードされている場合は、既存のアイコンを削除して新しいアイコンを保存する
    if file:
        # 既存のアイコンがあれば削除する
        _delete_icon_file(existing_link.icon_path)
        # 新しいアイコンを保存する
        icon_path = _save_icon_file(file)

    # 更新処理を実行する
    updated_link = DashboardLinkService.update(
        db,
        link_id,
        title=title,
        url=url,
        order_index=order_index,
        icon_path=icon_path,
    )
    if not updated_link:
        logger.debug("Dashboard link not found for link_id=%s", link_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard link not found")

    return _serialize_dashboard_link(updated_link)


@router.get("/{link_id}", response_model=DashboardLinkRead)
def get_link(
    link_id: UUID, db: Session = Depends(get_db), _admin=Depends(get_current_admin_user)
):
    """指定した ID のダッシュボードリンクを取得する。"""

    link = DashboardLinkService.get_by_id(db, link_id)
    if not link:
        logger.debug("Dashboard link not found for link_id=%s", link_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard link not found")
    return _serialize_dashboard_link(link)


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(
    link_id: UUID, db: Session = Depends(get_db), _admin=Depends(get_current_admin_user)
):
    """指定した ID のダッシュボードリンクを削除する。"""

    success = DashboardLinkService.delete(db, link_id)
    if not success:
        logger.debug("Dashboard link not found for link_id=%s", link_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard link not found")
    return None
