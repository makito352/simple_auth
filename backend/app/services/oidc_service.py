from typing import Dict, List, Optional
from uuid import UUID

from app.models.oidc import OidcClaimMapping, ValueSourceType
from app.models.user_option import UserOption
from app.schemas.oidc import ClaimMappingCreate
from sqlalchemy.orm import Session


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
        new_mapping = OidcClaimMapping(
            scope=data.scope,
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
        mappings = (
            db.query(OidcClaimMapping)
            .filter(OidcClaimMapping.scope.in_(requested_scopes))
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
