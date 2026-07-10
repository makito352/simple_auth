"""
ワンタイムリンクの生成と検証を行うサービスモジュール。
"""

import hashlib 
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.config import logger, settings
from app.models.one_time_link import OneTimeLink
from app.models.user import User
from app.schemas.one_time_link import OneTimeLinkCreateResponse
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Session


class LinkValidationError(ValueError):
    """トークンに関するクライアントエラー（期限切れ、無効など）"""

    pass


class IntegrityError(Exception):
    """データの不整合や予期せぬ状態によるエラー"""

    pass


class OneTimeLinkService:
    """
    ワンタイムURL（トークン）の生成と検証を管理するサービス。
    """

    @staticmethod
    def _build_response(db: Session, link: OneTimeLink) -> OneTimeLinkCreateResponse:
        """
        OneTimeLinkモデルからOneTimeLinkCreateResponseを作成します。
        内部的な共通ロジックとして使用します。
        """
        if link.type == "device_registration":
            url = f"{settings.FRONTEND_BASE_URL}/devices_add?token={link.token}"
        else:
            url = f"{settings.FRONTEND_BASE_URL}/register?token={link.token}"
        return OneTimeLinkCreateResponse(
            token=link.token,
            url=url,
            expires_at=link.expires_at.isoformat(),
            message="Link prepared",
        )

    @staticmethod
    def create_link(
        db: Session,
        user_id: UUID,
        link_type: str = "registration",
        expires_in_minutes: int = 60,
    ) -> OneTimeLinkCreateResponse:
        """
        新しいワンタイムリンクを作成します。

        Args:
            db: SQLAlchemyのセッション
            user_id: 紐付けるユーザーID
            link_type: リンクの種類 (e.g., "registration")
            expires_in_minutes: 有効期限（分）
        """
        # 本来は security ライブラリ等を用いてランダムな文字列を生成すべきですが、
        # ここでは簡略化のためuuidの文字列などを利用する想定です。
        token = f"tok_{secrets.token_urlsafe(32)}"

        expires_at = datetime.now().replace(tzinfo=None)

        # 期限を設定
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)

        # 新しいOneTimeLinkを作成
        new_link = OneTimeLink(
            user_id=user_id, token=token, type=link_type, expires_at=expires_at
        )

        # データベースに保存
        db.add(new_link)
        db.commit()
        db.refresh(new_link)

        return OneTimeLinkService._build_response(db, new_link)

    @staticmethod
    def verify_and_consume_link(db: Session, token: str) -> User:
        """
        トークンを検証し、消費（使用済みフラグを立てる）した上でユーザー情報を返します。

        このメソッドは「ワンタイム」なので、一度呼び出されると
        そのトークンは二度と使えないようになります。
        """
        # トークンの識別用ハッシュを作成 (セキュリティのため生のトークンは出力しない)
        token_hash = hashlib.sha256(token.encode()).hexdigest()[:10] # 最初の10文字程度を抽出

        # トークンに紐付くOneTimeLinkを取得
        link = db.query(OneTimeLink).filter(OneTimeLink.token == token).first()

        if not link:
            logger.error(f"Invalid OneTimeLink token: (hash={token_hash})")
            raise LinkValidationError(
                "無効なまたは存在しないリンクです。(Invalid or non-existent link.)"
            )

        # 使用済み、または期限切れのチェック
        now = datetime.now(timezone.utc)
        if link.used_at is not None:
            logger.warning(f"Already used OneTimeLink token: (hash={token_hash})")
            raise LinkValidationError(
                "このリンクは既に使用されています。(This link has already been used.)"
            )

        if link.expires_at < now:
            logger.warning(f"Expired OneTimeLink token: (hash={token_hash})")
            raise LinkValidationError(
                "このリンクは期限切れです。(This link has expired.)"
            )

        # トークンを消費（使用済みにする）
        link.used_at = now
        db.commit()
        db.refresh(link)

        # 紐付いているユーザーを取得して返す
        user = db.query(User).filter(User.id == link.user_id).first()
        if not user:
            logger.error(f"User associated with OneTimeLink token (hash={token_hash}) not found.")
            raise IntegrityError(
                "このリンクに関連付けられたユーザーは存在しません。(User associated with this link no longer exists.)"
            )

        return user

    @staticmethod
    def get_user_by_token(db: Session, token: str) -> Optional[User]:
        """
        消費はせず、単にトークンからユーザーを取得します。
        （内部的なチェックのみに使用）
        """
        link = db.query(OneTimeLink).filter(OneTimeLink.token == token).first()
        if (
            not link
            or link.used_at is not None
            or link.expires_at < datetime.now(timezone.utc)
        ):
            token_hash = hashlib.sha256(token.encode()).hexdigest()[:10] # 最初の10文字程度を抽出
            logger.debug(f"Token (hash={token_hash}) is invalid, used, or expired.")
            return None

        user = db.query(User).filter(User.id == link.user_id).first()
        return user

    @staticmethod
    def get_link_by_user_id(
        db: Session, user_id: UUID, link_type: str = "registration"
    ) -> Optional[OneTimeLinkCreateResponse]:
        """
        ユーザーIDに関連付けられたワンタイムリンクを取得し、
        作成時と同様のレスポンス形式で返します。
        """
        now = datetime.now(timezone.utc)
        link = (
            db.query(OneTimeLink)
            .filter(
                OneTimeLink.user_id == user_id,
                OneTimeLink.type == link_type,
                OneTimeLink.used_at is None,
                OneTimeLink.expires_at > now,
            )
            .first()
        )

        if not link:
            logger.debug(
                f"No valid OneTimeLink found for user_id {user_id} and type {link_type}."
            )
            return None

        return OneTimeLinkService._build_response(db, link)
