import secrets
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from app.core.config import logger
from app.models.oidc import (OidcClaimMapping, OidcClient, OidcClientScope,
                             OidcScope, ValueSourceType)
from app.models.user_option import UserOption
from app.schemas.oidc import (ClaimMappingCreate, OidcClientCreate,
                              OidcClientUpdate, OidcScopeCreate,
                              OidcScopeUpdate)
from app.utils.crypto import decrypt_value, encrypt_value
from sqlalchemy.orm import Session

SYSTEM_SCOPE_NAMES = {"openid", "profile", "email"}


class OidcScopeService:
    """OIDCスコープのCRUDと参照整合を担当するサービス。"""

    @staticmethod
    def _normalize_scope_name(scope_name: str) -> str:
        """スコープ名を正規化して空値を防ぐ。"""
        normalized = scope_name.strip()
        if not normalized:
            raise ValueError("scope_name must not be empty")
        return normalized

    @staticmethod
    def is_system_scope(scope_name: str) -> bool:
        """標準スコープかどうかを判定する。"""
        return scope_name in SYSTEM_SCOPE_NAMES

    @staticmethod
    def get_scope_by_name(db: Session, scope_name: str) -> Optional[OidcScope]:
        """scope_name でOIDCスコープを取得する。"""
        normalized = OidcScopeService._normalize_scope_name(scope_name)
        return db.query(OidcScope).filter(OidcScope.scope_name == normalized).first()

    @staticmethod
    def validate_scope_name_exists(db: Session, scope_name: str) -> str:
        """単一スコープ名が存在するか検証する。"""
        normalized = OidcScopeService._normalize_scope_name(scope_name)
        if not OidcScopeService.get_scope_by_name(db, normalized):
            raise ValueError(f"unknown scope: {normalized}")
        return normalized

    @staticmethod
    def validate_scope_names_exist(db: Session, scope_names: list[str]) -> list[str]:
        """複数スコープ名が存在するか検証する。"""
        normalized = sorted(
            {
                OidcScopeService._normalize_scope_name(scope_name)
                for scope_name in scope_names
            }
        )
        if not normalized:
            raise ValueError("scope_names must not be empty")

        valid_scope_names = {
            row.scope_name
            for row in db.query(OidcScope)
            .filter(OidcScope.scope_name.in_(normalized))
            .all()
        }
        missing = [scope for scope in normalized if scope not in valid_scope_names]
        if missing:
            raise ValueError(f"unknown scopes: {', '.join(missing)}")
        return normalized

    @staticmethod
    def _is_scope_referenced(db: Session, scope_name: str) -> bool:
        """関連テーブルからスコープ参照の有無を調べる。"""
        has_mapping = (
            db.query(OidcClaimMapping)
            .filter(OidcClaimMapping.scope == scope_name)
            .first()
            is not None
        )
        has_client_scope = (
            db.query(OidcClientScope)
            .filter(OidcClientScope.scope_name == scope_name)
            .first()
            is not None
        )
        return has_mapping or has_client_scope

    @staticmethod
    def to_response_dict(db: Session, scope: OidcScope) -> dict:
        """管理画面向けにOIDCスコープを整形する。"""
        is_system_scope = OidcScopeService.is_system_scope(scope.scope_name)
        is_referenced = OidcScopeService._is_scope_referenced(db, scope.scope_name)
        return {
            "scope_name": scope.scope_name,
            "description": scope.description,
            "is_system_scope": is_system_scope,
            "is_deletable": (not is_system_scope) and (not is_referenced),
        }

    @staticmethod
    def list_scopes(db: Session) -> list[dict]:
        """管理画面向けにOIDCスコープ一覧を返す。"""
        scopes = db.query(OidcScope).order_by(OidcScope.scope_name.asc()).all()
        return [OidcScopeService.to_response_dict(db, scope) for scope in scopes]

    @staticmethod
    def create_scope(db: Session, data: OidcScopeCreate) -> OidcScope:
        """OIDCスコープを作成する。"""
        normalized = OidcScopeService._normalize_scope_name(data.scope_name)
        if OidcScopeService.get_scope_by_name(db, normalized):
            raise ValueError("scope_name already exists")

        scope = OidcScope(scope_name=normalized, description=data.description)
        db.add(scope)
        db.commit()
        db.refresh(scope)
        return scope

    @staticmethod
    def update_scope(db: Session, scope_name: str, data: OidcScopeUpdate) -> OidcScope:
        """OIDCスコープの説明を更新する。"""
        scope = OidcScopeService.get_scope_by_name(db, scope_name)
        if not scope:
            raise ValueError("scope not found")

        scope.description = data.description
        db.commit()
        db.refresh(scope)
        return scope

    @staticmethod
    def delete_scope(db: Session, scope_name: str) -> None:
        """OIDCスコープを削除する。"""
        scope = OidcScopeService.get_scope_by_name(db, scope_name)
        if not scope:
            raise ValueError("scope not found")
        if OidcScopeService.is_system_scope(scope.scope_name):
            raise ValueError("system scope cannot be deleted")
        if OidcScopeService._is_scope_referenced(db, scope.scope_name):
            raise ValueError("scope is in use")

        db.delete(scope)
        db.commit()


class OidcClaimService:
    """
    OIDC関連のデータ操作およびマッピング処理を担当するサービス。
    """

    # --- 管理者用（Admin Operations） ---

    @staticmethod
    def get_all_claim_mappings(db: Session) -> List[OidcClaimMapping]:
        """管理画面などですべてのマッピングルールを表示するための取得"""
        return db.query(OidcClaimMapping).all()

    @staticmethod
    def get_claim_mapping_by_id(
        db: Session, mapping_id: str
    ) -> Optional[OidcClaimMapping]:
        """特定のIDでマッピングを取得する（更新・削除用）"""
        try:
            parsed_id = UUID(mapping_id)
        except ValueError as exc:
            raise ValueError("Invalid mapping id") from exc

        return (
            db.query(OidcClaimMapping).filter(OidcClaimMapping.id == parsed_id).first()
        )

    @staticmethod
    def create_claim_mapping(db: Session, data: ClaimMappingCreate) -> OidcClaimMapping:
        """新しいマッピングルールを作成する"""
        normalized_scope = OidcScopeService.validate_scope_name_exists(db, data.scope)
        new_mapping = OidcClaimMapping(
            scope=normalized_scope,
            claim_name=data.claim_name,
            value_source=(
                data.value_source.value
                if isinstance(data.value_source, ValueSourceType)
                else data.value_source
            ),
            value_key=data.value_key,
            static_value=data.static_value,
        )
        db.add(new_mapping)
        db.commit()
        db.refresh(new_mapping)
        return new_mapping

    @staticmethod
    def update_claim_mapping(
        db: Session, mapping_id: str, data: ClaimMappingCreate
    ) -> OidcClaimMapping:
        """既存のマッピングルールを更新する。"""
        mapping = OidcClaimService.get_claim_mapping_by_id(db, mapping_id)
        if not mapping:
            raise ValueError("mapping not found")

        mapping.scope = OidcScopeService.validate_scope_name_exists(db, data.scope)
        mapping.claim_name = data.claim_name
        mapping.value_source = (
            data.value_source.value
            if isinstance(data.value_source, ValueSourceType)
            else data.value_source
        )
        mapping.value_key = data.value_key
        mapping.static_value = data.static_value

        db.commit()
        db.refresh(mapping)
        return mapping

    # --- システム実行用（Runtime Resolution） ---

    @staticmethod
    def resolve_claims(
        db: Session, requested_scopes: list[str], user_id: str
    ) -> Dict[str, str]:
        """
        OIDCリクエスト時に、指定されたスコープに基づいて実際の値を解決する。

        Args:
            requested_scopes: クライアントが要求した ["imap", "smtp"] 等
            user_id: ユーザーのUUID

        Returns:
            辞書型: {"imap_server": "xxx.example.com", ...} のようなマッピングされた結果
        """
        # 1. マッピング定義を取得（該当するスコープに紐づくもの）
        normalized_scopes = [scope.strip() for scope in requested_scopes if scope and scope.strip()]
        if not normalized_scopes:
            return {}

        valid_scope_names = {
            row.scope_name
            for row in db.query(OidcScope)
            .filter(OidcScope.scope_name.in_(normalized_scopes))
            .all()
        }
        if not valid_scope_names:
            return {}

        mappings = (
            db.query(OidcClaimMapping)
            .filter(OidcClaimMapping.scope.in_(valid_scope_names))
            .all()
        )

        resolved_claims = {}

        for mapping in mappings:
            if mapping.value_source == ValueSourceType.STATIC.value:
                # 固定値の場合
                resolved_claims[mapping.claim_name] = mapping.static_value or ""

            elif mapping.value_source == ValueSourceType.USERPROFILE.value:
                # userフィールドから取得するロジック
                # 基本情報を返すようにしているから不要かな？
                pass

            elif (
                mapping.value_source == ValueSourceType.USER_ATTRIBUTE.value
                and mapping.value_key
            ):
                # UserOptionテーブルから動的に取得する
                option = (
                    db.query(UserOption)
                    .filter(
                        UserOption.user_id == user_id,
                        UserOption.key == mapping.value_key,
                    )
                    .first()
                )
                resolved_claims[mapping.claim_name] = option.value if option else None

        return {k: v for k, v in resolved_claims.items() if v is not None}


class OidcClientService:
    """OIDCクライアント管理と認可時検証を担当するサービス。"""

    @staticmethod
    def _mask_secret(secret: str) -> str:
        """client_secret の表示用マスクを生成する。"""
        if not secret:
            return ""
        visible = 4
        if len(secret) <= visible:
            return "*" * len(secret)
        return f"{'*' * (len(secret) - visible)}{secret[-visible:]}"

    @staticmethod
    def _format_datetime(value: Optional[datetime]) -> Optional[str]:
        """datetime を ISO8601 文字列へ変換する。"""
        return value.isoformat() if value else None

    @staticmethod
    def get_all_scopes(db: Session) -> list[OidcScope]:
        """定義済みOIDCスコープを一覧取得する。"""
        return db.query(OidcScope).order_by(OidcScope.scope_name.asc()).all()

    @staticmethod
    def get_scopes_by_client_id(db: Session, client_id: str) -> list[str]:
        """指定クライアントに許可されたスコープ一覧を返す。"""
        rows = (
            db.query(OidcClientScope)
            .filter(OidcClientScope.client_id == client_id)
            .order_by(OidcClientScope.scope_name.asc())
            .all()
        )
        return [row.scope_name for row in rows]

    @staticmethod
    def get_client_by_client_id(db: Session, client_id: str) -> Optional[OidcClient]:
        """client_id でOIDCクライアントを取得する。"""
        return db.query(OidcClient).filter(OidcClient.client_id == client_id).first()

    @staticmethod
    def _validate_scope_names(db: Session, scope_names: list[str]) -> list[str]:
        """リクエストされたスコープ名が存在するか検証する。"""
        return OidcScopeService.validate_scope_names_exist(db, scope_names)

    @staticmethod
    def _replace_client_scopes(db: Session, client_id: str, scope_names: list[str]) -> None:
        """クライアントに割り当てるスコープを全置換する。"""
        db.query(OidcClientScope).filter(OidcClientScope.client_id == client_id).delete()
        for scope_name in scope_names:
            db.add(OidcClientScope(client_id=client_id, scope_name=scope_name))

    @staticmethod
    def to_response_dict(
        db: Session,
        client: OidcClient,
        include_plain_secret: Optional[str] = None,
    ) -> dict:
        """APIレスポンス用の辞書へ整形する。"""
        try:
            plain_secret = decrypt_value(client.client_secret)
        except Exception:
            plain_secret = ""

        payload = {
            "id": client.id,
            "name": client.name,
            "client_id": client.client_id,
            "client_secret_masked": OidcClientService._mask_secret(plain_secret),
            "description": client.description,
            "allowed_redirect_uris": client.allowed_redirect_uris,
            "scope_names": OidcClientService.get_scopes_by_client_id(db, client.client_id),
            "is_active": client.is_active,
            "created_at": OidcClientService._format_datetime(client.created_at),
            "updated_at": OidcClientService._format_datetime(client.updated_at),
        }

        if include_plain_secret is not None:
            payload["client_secret"] = include_plain_secret

        return payload

    @staticmethod
    def list_clients(db: Session) -> list[dict]:
        """管理画面向けにOIDCクライアント一覧を取得する。"""
        clients = db.query(OidcClient).order_by(OidcClient.created_at.desc()).all()
        return [OidcClientService.to_response_dict(db=db, client=client) for client in clients]

    @staticmethod
    def create_client(db: Session, data: OidcClientCreate) -> tuple[OidcClient, str]:
        """OIDCクライアントを新規作成する。"""
        existing = OidcClientService.get_client_by_client_id(db, data.client_id)
        if existing:
            raise ValueError("client_id already exists")
        if not data.allowed_redirect_uris:
            raise ValueError("allowed_redirect_uris must not be empty")

        valid_scopes = OidcClientService._validate_scope_names(db, data.scope_names)
        plain_secret = secrets.token_urlsafe(32)

        client = OidcClient(
            name=data.name,
            client_id=data.client_id,
            client_secret=encrypt_value(plain_secret),
            description=data.description,
            allowed_redirect_uris=data.allowed_redirect_uris,
            is_active=data.is_active,
        )
        db.add(client)
        db.flush()
        OidcClientService._replace_client_scopes(db, data.client_id, valid_scopes)
        db.commit()
        db.refresh(client)
        return client, plain_secret

    @staticmethod
    def update_client(db: Session, client_id: str, data: OidcClientUpdate) -> OidcClient:
        """OIDCクライアントを更新する。"""
        client = OidcClientService.get_client_by_client_id(db, client_id)
        if not client:
            raise ValueError("client not found")
        if not data.allowed_redirect_uris:
            raise ValueError("allowed_redirect_uris must not be empty")

        valid_scopes = OidcClientService._validate_scope_names(db, data.scope_names)

        client.name = data.name
        client.description = data.description
        client.allowed_redirect_uris = data.allowed_redirect_uris
        client.is_active = data.is_active
        OidcClientService._replace_client_scopes(db, client.client_id, valid_scopes)
        db.commit()
        db.refresh(client)
        return client

    @staticmethod
    def rotate_client_secret(db: Session, client_id: str) -> tuple[OidcClient, str]:
        """クライアントシークレットを再発行する。"""
        client = OidcClientService.get_client_by_client_id(db, client_id)
        if not client:
            raise ValueError("client not found")

        plain_secret = secrets.token_urlsafe(32)
        client.client_secret = encrypt_value(plain_secret)
        db.commit()
        db.refresh(client)
        return client, plain_secret

    @staticmethod
    def set_client_active(db: Session, client_id: str, is_active: bool) -> OidcClient:
        """クライアントの有効/無効を切り替える。"""
        client = OidcClientService.get_client_by_client_id(db, client_id)
        if not client:
            raise ValueError("client not found")
        client.is_active = is_active
        db.commit()
        db.refresh(client)
        return client

    @staticmethod
    def validate_authorize_request(
        db: Session,
        client_id: str,
        redirect_uri: str,
        requested_scope_names: list[str],
    ) -> OidcClient:
        """/authorize で必要なクライアント検証を行う。"""
        client = OidcClientService.get_client_by_client_id(db, client_id)
        if not client:
            logger.info("Client %s is not found", client_id)
            raise ValueError("invalid_client")
        if not client.is_active:
            logger.info("Client %s is inactive", client_id)
            raise ValueError("invalid_client")

        if redirect_uri not in (client.allowed_redirect_uris or []):
            raise ValueError("invalid_redirect_uri")

        allowed_scopes = set(OidcClientService.get_scopes_by_client_id(db, client_id))
        requested_scopes = set(scope for scope in requested_scope_names if scope)
        if not requested_scopes:
            raise ValueError("invalid_scope")

        if not requested_scopes.issubset(allowed_scopes):
            raise ValueError("invalid_scope")

        return client

    @staticmethod
    def validate_token_client(
        db: Session,
        client_id: Optional[str],
        client_secret: Optional[str],
    ) -> OidcClient:
        """/token の client_id/client_secret を検証する。"""
        if not client_id or not client_secret:
            raise ValueError("invalid_client")

        client = OidcClientService.get_client_by_client_id(db, client_id)
        if not client:
            logger.info("Client %s is not found", client_id)
            raise ValueError("invalid_client")
        if not client.is_active:
            logger.info("Client %s is inactive", client_id)
            raise ValueError("invalid_client")

        try:
            decrypted_secret = decrypt_value(client.client_secret)
        except Exception as exc:
            raise ValueError("invalid_client") from exc

        if not secrets.compare_digest(decrypted_secret, client_secret):
            raise ValueError("invalid_client")

        return client
