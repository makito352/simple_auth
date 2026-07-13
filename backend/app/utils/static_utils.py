"""
静的ファイル関連の共通ユーティリティを提供するモジュールです。

このモジュールはバックエンドの `backend/app/static` および
その配下の `icons` ディレクトリのパスを一元管理し、
存在しない場合は必要なディレクトリを作成します。
"""

from pathlib import Path

from app.core.config import logger

# 静的ファイルのルートディレクトリ名
STATIC_DIR_NAME = "static"
# アイコンを保存するサブディレクトリ名
ICONS_DIR_NAME = "icons"
# FastAPI で公開する静的ファイルの URL パス
STATIC_MOUNT_PATH = "/static"
# アイコンの URL プレフィックス
ICON_URL_PREFIX = f"{STATIC_MOUNT_PATH}/{ICONS_DIR_NAME}"


def get_app_root_dir() -> Path:
    """バックエンドアプリケーションのルートディレクトリを返します。

    例: backend/app
    """
    return Path(__file__).resolve().parent.parent


def get_static_dir() -> Path:
    """静的ファイルのルートディレクトリへの絶対パスを返します。"""
    return get_app_root_dir() / STATIC_DIR_NAME


def get_static_icons_dir() -> Path:
    """アイコン用静的ディレクトリへの絶対パスを返します。"""
    return get_static_dir() / ICONS_DIR_NAME


def ensure_static_dirs_exists() -> Path:
    """静的ファイルとアイコンディレクトリが存在することを保証し、静的ディレクトリを返します。"""
    static_dir = get_static_dir()
    icons_dir = get_static_icons_dir()

    if not static_dir.exists():
        logger.warning(
            "静的ファイルディレクトリが見つからないため、作成します: %s", static_dir
        )
        static_dir.mkdir(parents=True, exist_ok=True)

    if not icons_dir.exists():
        logger.info("静的アイコンディレクトリを作成します: %s", icons_dir)
        icons_dir.mkdir(parents=True, exist_ok=True)

    return static_dir.resolve()
