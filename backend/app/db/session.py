"""
データベース接続とセッション管理を提供するモジュール。
このモジュールでは、SQLAlchemyを使用してデータベース接続を確立し、セッションを管理するための関数を提供します。
"""

from app.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


# データベース接続の設定
db_url = f"postgresql+psycopg2://{settings.DATABASE_USER}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_DB_HOST}/{settings.DATABASE_NAME}"

# SQLAlchemyエンジンの作成
engine = create_engine(
    db_url,
    future=True,
    pool_pre_ping=True,
)

# セッションローカルの作成
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)


def get_db():
    """
    データベースセッションを取得するための依存関数。
    FastAPIの依存性注入で使用されます。
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
