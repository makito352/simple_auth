"""
AuthenticationOptionのサービスモジュール。
このモジュールでは、認証オプションの保存と取得に関するビジネスロジックを提供します。
"""

from datetime import datetime, timedelta, timezone

from app.core.config import logger
from app.models.auth_options import AuthenticationOption
from sqlalchemy.orm import Session


class AuthOptionsService:
    """
    認証オプションの保存と取得を管理するサービスクラス。
    このサービスは、セッショントークンに関連付けられた認証チャレンジの保存と取得を行います。
    """

    @staticmethod
    def save_auth_challenge(
        db: Session,
        session_token: str,
        challenge: bytes,
        expires_in_minutes: int = 5,
    ):
        """
        認証チャレンジをデータベースに保存します。
        Args:
            db: SQLAlchemyのセッション
            session_token: セッショントークン
            challenge: 認証チャレンジ（バイト列）
            expires_in_minutes: 認証オプションの有効期限（分）
        """
        # 認証オプションの有効期限を設定
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)

        # AuthenticationOptionモデルのインスタンスを作成
        auth_option = AuthenticationOption(
            session_token=session_token, challenge=challenge, expires_at=expires_at
        )

        # データベースに保存
        db.add(auth_option)
        db.commit()
        db.refresh(auth_option)

        return auth_option

    @staticmethod
    def get_auth_challenge(
        db: Session,
        session_token: str,
    ):
        """
        セッショントークンに対応する認証チャレンジをデータベースから取得します。
        Args:
            db: SQLAlchemyのセッション
            session_token: セッショントークン
        Returns:
            認証チャレンジ（バイト列）またはNone（存在しない場合）
        """
        # 現在時刻を取得
        current_time = datetime.now(timezone.utc)

        # データベースから有効な認証オプションを取得
        auth_option = (
            db.query(AuthenticationOption)
            .filter(
                AuthenticationOption.session_token == session_token,
                AuthenticationOption.expires_at > current_time,
            )
            .first()
        )

        # 認証オプションが存在しない場合はNoneを返す
        result = auth_option.challenge if auth_option else None
        logger.debug("Retrieved authentication challenge: exists=%s", result is not None)

        return result

    @staticmethod
    def consume_auth_challenge(db: Session, session_token: str) -> int:
        """
        指定セッショントークンに紐づく認証チャレンジを消費（削除）します。

        Args:
            db: SQLAlchemyのセッション
            session_token: セッショントークン

        Returns:
            int: 削除した認証チャレンジ件数
        """
        # 使い回しを防ぐため、同一トークンに紐づくチャレンジを削除する
        deleted_count = (
            db.query(AuthenticationOption)
            .filter(AuthenticationOption.session_token == session_token)
            .delete(synchronize_session=False)
        )
        db.commit()
        logger.debug(
            "Consumed authentication challenge for session_token. deleted_count=%s",
            deleted_count,
        )
        return deleted_count
