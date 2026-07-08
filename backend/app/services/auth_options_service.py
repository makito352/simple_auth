"""
AuthenticationOptionのサービスモジュール。
このモジュールでは、認証オプションの保存と取得に関するビジネスロジックを提供します。
"""

from datetime import datetime, timedelta, timezone

from app.core.config import logger
from app.models.auth_options import AuthenticationOption
from sqlalchemy.orm import Session

# 認証オプションの有効期限（分単位）
OPTION_VALIDITY_PERIOD = 5


class AuthOptionsService:

    @staticmethod
    def save_auth_challenge(
        db: Session,
        session_token: str,
        challenge: bytes,
    ):
        """
        認証チャレンジをデータベースに保存します。
        Args:
            db: SQLAlchemyのセッション
            session_token: セッショントークン
            challenge: 認証チャレンジ（バイト列）
        """
        # 認証オプションの有効期限を設定
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=OPTION_VALIDITY_PERIOD
        )

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
        logger.debug(
            "Retrieved challenge for session_token=%s: %s", session_token, result
        )

        return result
