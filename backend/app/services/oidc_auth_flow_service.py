"""
OIDC認証フロー向けのDB操作を集約するサービス。
認可コードとアクセストークンの永続化・参照・消費を担当する。
"""

import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.models.oidc import OidcAccessToken, OidcAuthCode
from sqlalchemy.orm import Session


class OidcAuthFlowService:
    """OIDC認証フロー専用の永続化ロジックを提供するサービス。"""

    @staticmethod
    def issue_auth_code(
        db: Session,
        client_id: str,
        redirect_uri: str,
        scope: str,
        user_id: UUID,
    ) -> OidcAuthCode:
        """
        認可コードを生成して保存し、保存済みのエンティティを返す。
        """
        # 予測困難な認可コードを生成する
        code = secrets.token_urlsafe(32)

        # 発行した認可コードを永続化する
        auth_code = OidcAuthCode(
            code=code,
            client_id=client_id,
            redirect_uri=redirect_uri,
            scope=scope,
            user_id=user_id,
        )
        db.add(auth_code)
        db.commit()
        db.refresh(auth_code)
        return auth_code

    @staticmethod
    def find_auth_code_for_token_exchange(
        db: Session,
        code: str,
        client_id: str,
    ) -> Optional[OidcAuthCode]:
        """
        /token の交換に利用する認可コードを client_id 条件付きで取得する。
        """
        return (
            db.query(OidcAuthCode)
            .filter(OidcAuthCode.code == code, OidcAuthCode.client_id == client_id)
            .first()
        )

    @staticmethod
    def is_redirect_uri_match(auth_code: OidcAuthCode, redirect_uri: str) -> bool:
        """
        認可コード発行時の redirect_uri と、トークン交換時の redirect_uri を比較する。
        """
        return auth_code.redirect_uri == redirect_uri

    @staticmethod
    def consume_auth_code(db: Session, auth_code: OidcAuthCode) -> None:
        """
        一度利用した認可コードを削除して再利用を防ぐ。
        """
        db.delete(auth_code)
        db.commit()

    @staticmethod
    def store_access_token(
        db: Session,
        token: str,
        user_id: UUID,
        expires_at: datetime,
    ) -> OidcAccessToken:
        """
        発行したアクセストークンを保存して返す。
        """
        access_token = OidcAccessToken(
            token=token,
            user_id=user_id,
            expires_at=expires_at,
        )
        db.add(access_token)
        db.commit()
        db.refresh(access_token)
        return access_token

    @staticmethod
    def find_access_token(db: Session, token: str) -> Optional[OidcAccessToken]:
        """
        token 文字列に一致するアクセストークンを取得する。
        """
        return db.query(OidcAccessToken).filter(OidcAccessToken.token == token).first()

    @staticmethod
    def is_access_token_expired(
        access_token: OidcAccessToken,
        now: Optional[datetime] = None,
    ) -> bool:
        """
        アクセストークンの有効期限切れを判定する。
        """
        current_time = now or datetime.now(timezone.utc)
        return access_token.expires_at < current_time
