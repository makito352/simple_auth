from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.config import logger, settings
from app.models.one_time_link import OneTimeLink
from app.models.user import User
from app.schemas.one_time_link import OneTimeLinkCreateResponse
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Session


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
            url = f"{settings.FRONTEND_BASE_URL}/devices/add?token={link.token}"
        else:
            url = f"{settings.FRONTEND_BASE_URL}/register?token={link.token}"
        return OneTimeLinkCreateResponse(
            token=link.token,
            url=url,
            expires_at=link.expires_at.isoformat(),
            message="Link prepared",  # または適切なメッセージ
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
        import secrets

        token = f"tok_{secrets.token_urlsafe(32)}"

        expires_at = datetime.now().replace(
            tzinfo=None
        )  # タイムゾーン処理はモデル側かConfigで調整
        # もしDBがタイムゾーンを要求する場合は、ここで適切なTimezone付与を行う
        # 以下は単純な例です。実際の実装ではdatetime.now(timezone.utc)などを使用します。
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)

        new_link = OneTimeLink(
            user_id=user_id, token=token, type=link_type, expires_at=expires_at
        )

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
        link = db.query(OneTimeLink).filter(OneTimeLink.token == token).first()

        if not link:
            logger.error(f"Invalid OneTimeLink token: {token}")
            raise ValueError("Invalid or non-existent link.")

        # 使用済み、または期限切れのチェック
        now = datetime.now(timezone.utc)
        if link.used_at is not None:
            logger.warning(f"Already used OneTimeLink token: {token}")
            raise ValueError("This link has already been used.")

        if link.expires_at < now:
            logger.warning(f"Expired OneTimeLink token: {token}")
            raise ValueError("This link has expired.")

        # トークンを消費（使用済みにする）
        link.used_at = now
        db.commit()
        db.refresh(link)

        # 紐付いているユーザーを取得して返す
        user = db.query(User).filter(User.id == link.user_id).first()
        if not user:
            raise ValueError("User associated with this link no longer exists.")

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
                OneTimeLink.used_at == None,
                OneTimeLink.expires_at > now,
            )
            .first()
        )

        if not link:
            return None

        return OneTimeLinkService._build_response(db, link)
