"""
OIDC管理系（クライアント/スコープ/クレーム）のデータ操作を担当するサービス。
認可コードやアクセストークンの認証フロー処理は oidc_auth_flow_service に分離する。
"""

import secrets
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from app.core.config import logger
from app.models.oidc import (
    OidcClaimMapping,
    OidcClient,
    OidcClientScope,
    OidcScope,
    ValueSourceType,
)
from app.schemas.oidc import (
    ClaimMappingCreate,
    OidcClientCreate,
    OidcClientUpdate,
    OidcScopeCreate,
    OidcScopeUpdate,
)
from app.services.user_option_service import UserOptionService
from app.utils.crypto import decrypt_value, encrypt_value
from sqlalchemy.orm import Session

# OIDCの標準スコープ名のセット
SYSTEM_SCOPE_NAMES = {"openid", "profile", "email", "offline_access"}


class OidcScopeService:
    """OidcScopeクラスの操作と、スコープに関連するバリデーションを担当するサービス。"""

    @staticmethod
    def _normalize_scope_name(scope_name: str) -> str:
        """
        入力されたスコープ名をトリミングし、空文字でないか確認する。
        """
        normalized = scope_name.strip()
        if not normalized:
            raise ValueError("scope_name must not be empty")
        return normalized

    @staticmethod
    def is_system_scope(scope_name: str) -> bool:
        """
        提供されているスコープがシステム標準の（変更不可な）ものか判定する。
        """
        return OidcScopeService._normalize_scope_name(scope_name) in SYSTEM_SCOPE_NAMES

    @staticmethod
    def get_scope_by_name(db: Session, scope_name: str) -> Optional[OidcScope]:
        """
        指定された名前のスコープをDBから取得する。
        """
        # スコープ名を正規化して空値を防ぐ
        normalized = OidcScopeService._normalize_scope_name(scope_name)

        # データベースからスコープを取得
        return db.query(OidcScope).filter(OidcScope.scope_name == normalized).first()

    @staticmethod
    def validate_scope_name_exists(db: Session, scope_name: str) -> str:
        """
        単一のスコープ名がシステムに登録されているか検証する。
        """
        # スコープ名を正規化して空値を防ぐ
        normalized = OidcScopeService._normalize_scope_name(scope_name)

        # データベースからスコープを取得して存在を確認
        if not OidcScopeService.get_scope_by_name(db, normalized):
            logger.debug("Scope not found: %s", normalized)
            raise ValueError(f"unknown scope: {normalized}")

        return normalized

    @staticmethod
    def validate_scope_names_exist(db: Session, scope_names: list[str]) -> list[str]:
        """
        複数のスコープ名がすべてシステムに登録されているか一括検証する。
        """
        # 重複を排除し、正規化したリストを作成
        normalized = sorted(
            {
                OidcScopeService._normalize_scope_name(scope_name)
                for scope_name in scope_names
            }
        )
        if not normalized:
            raise ValueError("scope_names must not be empty")

        # 実際にDBに存在するスコープの集合を取得
        valid_scope_names = {
            row.scope_name
            for row in db.query(OidcScope)
            .filter(OidcScope.scope_name.in_(normalized))
            .all()
        }
        # 存在しないスコープを特定してエラーを投げる
        missing = [scope for scope in normalized if scope not in valid_scope_names]
        if missing:
            raise ValueError(f"unknown scopes: {', '.join(missing)}")
        return normalized

    @staticmethod
    def _is_scope_referenced(db: Session, scope_name: str) -> bool:
        """
        特定のスコープが、マッピング定義やクライアント割当てで使用されているか確認する。
        """
        # クレームのマッピングに使用されているか
        has_mapping = (
            db.query(OidcClaimMapping)
            .filter(OidcClaimMapping.scope == scope_name)
            .first()
            is not None
        )
        # 特定のクライアントに割り当てられているか
        has_client_scope = (
            db.query(OidcClientScope)
            .filter(OidcClientScope.scope_name == scope_name)
            .first()
            is not None
        )
        return has_mapping or has_client_scope

    @staticmethod
    def to_response_dict(db: Session, scope: OidcScope) -> dict:
        """
        管理画面の表示用にOIDCスコープの情報を整形する。
        削除可能かどうかの判定を含める。
        """
        is_system_scope = OidcScopeService.is_system_scope(scope.scope_name)
        is_referenced = OidcScopeService._is_scope_referenced(db, scope.scope_name)
        return {
            "scope_name": scope.scope_name,
            "description": scope.description,
            "is_system_scope": is_system_scope,
            # システム標準ではなく、かつどこにも参照されていなければ削除可能とみなす
            "is_deletable": (not is_system_scope) and (not is_referenced),
        }

    @staticmethod
    def list_scopes(db: Session) -> list[dict]:
        """
        管理画面用にすべてのOIDCスコープをリスト形式で取得する。
        """
        scopes = db.query(OidcScope).order_by(OidcScope.scope_name.asc()).all()
        return [OidcScopeService.to_response_dict(db, scope) for scope in scopes]

    @staticmethod
    def create_scope(db: Session, data: OidcScopeCreate) -> OidcScope:
        """
        新しいOIDCスコープを作成する。重複チェックを含む。
        """
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
        """
        既存のOIDCスコープの説明文を更新する。
        """
        scope = OidcScopeService.get_scope_by_name(db, scope_name)
        if not scope:
            raise ValueError("scope not found")

        scope.description = data.description
        db.commit()
        db.refresh(scope)
        return scope

    @staticmethod
    def delete_scope(db: Session, scope_name: str) -> None:
        """
        OIDCスコープを削除する。システム予約や使用中の場合はエラーを返す。
        """
        scope = OidcScopeService.get_scope_by_name(db, scope_name)
        if not scope:
            raise ValueError("scope not found")
        # システム標準のスコープは削除不可
        if OidcScopeService.is_system_scope(scope.scope_name):
            raise ValueError("system scope cannot be deleted")
        # 他で参照されている場合は削除不可
        if OidcScopeService._is_scope_referenced(db, scope.scope_name):
            raise ValueError("scope is in use")

        db.delete(scope)
        db.commit()


class OidcClaimService:
    """
    OIDCのクレーム定義（マッピング）の管理と、実行時の値の解決を担当するサービス。
    """

    # --- 管理者用（Admin Operations） ---

    @staticmethod
    def get_all_claim_mappings(db: Session) -> List[OidcClaimMapping]:
        """
        全マッピングルールを取得する。
        """
        return db.query(OidcClaimMapping).all()

    @staticmethod
    def get_claim_mapping_by_id(
        db: Session, mapping_id: str
    ) -> Optional[OidcClaimMapping]:
        """
        IDを元に特定のマッピング定義を取得する。
        """
        try:
            parsed_id = UUID(mapping_id)
        except ValueError as exc:
            raise ValueError("Invalid mapping id") from exc

        return (
            db.query(OidcClaimMapping).filter(OidcClaimMapping.id == parsed_id).first()
        )

    @staticmethod
    def create_claim_mapping(db: Session, data: ClaimMappingCreate) -> OidcClaimMapping:
        """
        新しいクレームのマッピングルールを作成する。
        """
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
        """
        既存のマッピングルールを更新する。
        """
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
        リクエストされたスコープに基づき、ユーザーの属性や固定値を組み合わせてクレームを解決する。

        Args:
            requested_scopes: クライアントが要求した ["imap", "smtp"] などの一覧。
            user_id: 現在のログインユーザーの識別子。

        Returns:
            解決されたクレームの辞書（例: {"imap_server": "xxx.example.com"}）。
        """
        # リクエストされたスコープを正規化
        normalized_scopes = [
            scope.strip() for scope in requested_scopes if scope and scope.strip()
        ]
        if not normalized_scopes:
            return {}

        # データベース内に存在する有効なスコープのみ抽出
        valid_scope_names = {
            row.scope_name
            for row in db.query(OidcScope)
            .filter(OidcScope.scope_name.in_(normalized_scopes))
            .all()
        }
        if not valid_scope_names:
            return {}

        # 該当するスコープに紐付いているすべてのマッピング定義を取得
        mappings = (
            db.query(OidcClaimMapping)
            .filter(OidcClaimMapping.scope.in_(valid_scope_names))
            .all()
        )

        # 値の取得元が「ユーザー属性」の場合、そのキーを抽出して一括取得する
        requested_user_option_keys = sorted(
            {
                mapping.value_key
                for mapping in mappings
                if (
                    mapping.value_source == ValueSourceType.USER_ATTRIBUTE.value
                    and mapping.value_key
                )
            }
        )
        # UserOptionService経由で復号済みの値を一括取得
        user_option_values = UserOptionService.get_user_option_values_by_keys(
            db=db,
            user_id=user_id,
            keys=requested_user_option_keys,
        )

        resolved_claims = {}

        for mapping in mappings:
            if mapping.value_source == ValueSourceType.STATIC.value:
                # 固定値の設定（例：システムの共通URLなど）
                resolved_claims[mapping.claim_name] = mapping.static_value or ""

            elif mapping.value_source == ValueSourceType.USERPROFILE.value:
                # プロフィール情報から取得するロジック（必要に応じて拡張）
                pass

            elif (
                mapping.value_source == ValueSourceType.USER_ATTRIBUTE.value
                and mapping.value_key
            ):
                # ユーザー設定やカスタム属性から復号済みの値を取得
                resolved_claims[mapping.claim_name] = user_option_values.get(
                    mapping.value_key
                )

        # Noneの値を排除して結果を返す
        return {k: v for k, v in resolved_claims.items() if v is not None}


class OidcClientService:
    """OidcClientモデルの管理、および認可フローにおけるクライアント情報の検証を担当するサービス。"""

    @staticmethod
    def _mask_secret(secret: str) -> str:
        """
        秘密鍵を画面表示用にマスクする（末尾数文字のみ公開）。
        """
        if not secret:
            return ""
        visible = 4
        if len(secret) <= visible:
            return "*" * len(secret)
        return f"{'*' * (len(secret) - visible)}{secret[-visible:]}"

    @staticmethod
    def _format_datetime(value: Optional[datetime]) -> Optional[str]:
        """
        DateTime型をISO8601形式の文字列に変換する。
        """
        return value.isoformat() if value else None

    @staticmethod
    def get_all_scopes(db: Session) -> list[OidcScope]:
        """
        定義されている全スコープを一覧取得する。
        """
        return db.query(OidcScope).order_by(OidcScope.scope_name.asc()).all()

    @staticmethod
    def get_scopes_by_client_id(db: Session, client_id: str) -> list[str]:
        """
        特定のクライアントIDに紐付いているスコープ名のリストを取得する。
        """
        rows = (
            db.query(OidcClientScope)
            .filter(OidcClientScope.client_id == client_id)
            .order_by(OidcClientScope.scope_name.asc())
            .all()
        )
        return [row.scope_name for row in rows]

    @staticmethod
    def get_client_by_client_id(db: Session, client_id: str) -> Optional[OidcClient]:
        """
        クライアントIDからOidcClientエンティティを取得する。
        """
        return db.query(OidcClient).filter(OidcClient.client_id == client_id).first()

    @staticmethod
    def _validate_scope_names(db: Session, scope_names: list[str]) -> list[str]:
        """
        リクエストに含まれるスコープ名がシステムに存在するか検証する。
        """
        return OidcScopeService.validate_scope_names_exist(db, scope_names)

    @staticmethod
    def _replace_client_scopes(
        db: Session, client_id: str, scope_names: list[str]
    ) -> None:
        """
        クライアントに紐付けられた既存のスコープ設定を全削除し、新しいリストで再登録する。
        """
        db.query(OidcClientScope).filter(
            OidcClientScope.client_id == client_id
        ).delete()
        for scope_name in scope_names:
            db.add(OidcClientScope(client_id=client_id, scope_name=scope_name))

    @staticmethod
    def to_response_dict(
        db: Session,
        client: OidcClient,
        include_plain_secret: Optional[str] = None,
    ) -> dict:
        """
        APIレスポンス用にOidcClientのデータを辞書形式に変換する。
        必要に応じて生のシークレットを含めることができる。
        """
        try:
            # 暗号化されたシークレットを復号
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
            "scope_names": OidcClientService.get_scopes_by_client_id(
                db, client.client_id
            ),
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
        return [
            OidcClientService.to_response_dict(db=db, client=client)
            for client in clients
        ]

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
    def update_client(
        db: Session, client_id: str, data: OidcClientUpdate
    ) -> OidcClient:
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
            logger.debug("Client %s is not found", client_id)
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
            logger.debug("Client %s is not found", client_id)
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
            logger.debug("Client %s is not found", client_id)
            raise ValueError("invalid_client")
        if not client.is_active:
            logger.debug("Client %s is inactive", client_id)
            raise ValueError("invalid_client")

        if redirect_uri not in (client.allowed_redirect_uris or []):
            raise ValueError("invalid_redirect_uri")

        allowed_scopes = set(OidcClientService.get_scopes_by_client_id(db, client_id))
        requested_scopes = set(scope for scope in requested_scope_names if scope)
        if not requested_scopes:
            logger.info("No scopes requested by client %s, requested_scopes: %s, allowed_scopes: %s", client_id, requested_scopes, allowed_scopes)
            raise ValueError("invalid_scope")

        if not requested_scopes.issubset(allowed_scopes):
            logger.info("Requested scopes by client %s are not allowed, requested_scopes: %s, allowed_scopes: %s", client_id, requested_scopes, allowed_scopes)
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
            logger.debug("Client ID or secret is missing")
            raise ValueError("invalid_client")

        client = OidcClientService.get_client_by_client_id(db, client_id)
        if not client:
            logger.debug("Client %s is not found", client_id)
            raise ValueError("invalid_client")
        if not client.is_active:
            logger.debug("Client %s is inactive", client_id)
            raise ValueError("invalid_client")

        try:
            decrypted_secret = decrypt_value(client.client_secret)
        except Exception as exc:
            raise ValueError("invalid_client") from exc

        # Compare the provided client_secret with the decrypted one
        if not secrets.compare_digest(decrypted_secret, client_secret):
            logger.debug("Client %s provided an invalid secret", client_id)
            raise ValueError("invalid_client")

        return client
