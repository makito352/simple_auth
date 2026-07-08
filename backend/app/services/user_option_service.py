"""
UserOptionService: ユーザーオプションの取得・更新・削除を行うサービスクラス
"""

from uuid import UUID

from app.core.config import logger
from app.models.user_option import UserOption, UserOptionAttribute
from app.schemas.user_option import (
    OptionAttributeOut,
    UserOptionBulkUpdate,
    UserOptionOut,
)
from app.utils.crypto import decrypt_value, encrypt_value
from sqlalchemy.orm import Session


class UserOptionService:
    @staticmethod
    def get_user_option_values_by_keys(
        db: Session, user_id: UUID | str, keys: list[str]
    ) -> dict[str, str]:
        """指定ユーザーの指定キー群を復号込みで辞書化して返す。"""
        normalized_keys = sorted({key.strip() for key in keys if key and key.strip()})
        if not normalized_keys:
            return {}

        # マスタ情報を取得して、暗号化されているかどうかを判定するための辞書を作成
        attributes_map = {
            attr.key: attr
            for attr in db.query(UserOptionAttribute)
            .filter(UserOptionAttribute.key.in_(normalized_keys))
            .all()
        }

        # 指定ユーザーの指定キー群の値を取得
        raw_options = (
            db.query(UserOption)
            .filter(UserOption.user_id == user_id, UserOption.key.in_(normalized_keys))
            .all()
        )

        # 復号処理を行い、最終的な値を辞書化して返す
        resolved_values: dict[str, str] = {}
        for opt in raw_options:
            attr_meta = attributes_map.get(opt.key)
            if attr_meta and attr_meta.encrypted and opt.encrypted_value:
                resolved_values[opt.key] = decrypt_value(opt.encrypted_value)
            elif opt.value is not None:
                resolved_values[opt.key] = opt.value

        return resolved_values

    @staticmethod
    def get_all_attributes(db: Session) -> list[OptionAttributeOut]:
        """全属性の定義を取得する（マスタ）"""
        return db.query(UserOptionAttribute).all()

    @staticmethod
    def get_attribute_by_id(db: Session, attr_id: UUID) -> OptionAttributeOut:
        """特定の属性詳細を返す"""
        return (
            db.query(UserOptionAttribute)
            .filter(UserOptionAttribute.id == attr_id)
            .first()
        )

    @staticmethod
    def create_attribute(db: Session, attrs: dict) -> UserOptionAttribute:
        """新しい属性情報を作成する"""
        new_attr = UserOptionAttribute(**attrs)
        db.add(new_attr)
        db.commit()
        db.refresh(new_attr)
        return new_attr

    @staticmethod
    def update_attribute(db: Session, attr_id: UUID, data: dict) -> UserOptionAttribute:
        """特定の属性情報を更新する"""
        attr = (
            db.query(UserOptionAttribute)
            .filter(UserOptionAttribute.id == attr_id)
            .first()
        )
        if not attr:
            # 存在しない場合はNoneを返す
            logger.debug("Attribute with ID %s not found for update.", attr_id)
            return None

        for key, value in data.items():
            if hasattr(attr, key):
                setattr(attr, key, value)

        db.commit()
        db.refresh(attr)
        return attr

    @staticmethod
    def delete_attribute(db: Session, attr_id: UUID):
        """特定の属性情報を削除する"""
        attr = (
            db.query(UserOptionAttribute)
            .filter(UserOptionAttribute.id == attr_id)
            .first()
        )
        if attr:
            db.delete(attr)
            db.commit()
        else:
            logger.debug("Attribute with ID %s not found for deletion.", attr_id)

    @staticmethod
    def get_user_options(db: Session, user_id: UUID) -> list[UserOptionOut]:
        """
        特定ユーザーのすべての値を一括取得し、スキーマに変換して返す。
        暗号化されている場合は復号処理を行い、純粋な値のみをレスポンス用に抽出する。
        """
        # マスタ情報を取得（どのキーが暗号化されているかの判定用）
        attributes_map = {
            attr.key: attr for attr in db.query(UserOptionAttribute).all()
        }

        raw_options = db.query(UserOption).filter(UserOption.user_id == user_id).all()

        results = []
        for opt in raw_options:
            attr_meta = attributes_map.get(opt.key)
            # 復号処理の実行
            final_value = opt.value
            if attr_meta and attr_meta.encrypted and opt.encrypted_value:
                final_value = decrypt_value(opt.encrypted_value)

            # Schemaに変換して、不要なフィールド（encrypted_valueなど）を除外する
            results.append(UserOptionOut(key=opt.key, value=final_value))

        return results

    @staticmethod
    def bulk_update_user_options(
        db: Session, user_id: UUID, options: list[UserOptionBulkUpdate]
    ) -> list[UserOptionOut]:
        """
        【Bulk Update】
        マスタの encrypted フラグを確認し、True の場合は暗号化処理を施してから保存します。
        """
        logger.debug(
            "Bulk updating user options for user_id=%s optionslen=%d options=%s",
            user_id,
            len(options),
            options,
        )

        # 効率のためマスタ情報を一括取得して辞書化
        attributes_map = {
            attr.key: attr for attr in db.query(UserOptionAttribute).all()
        }

        processed_items = []
        for item in options:
            key = item.key
            raw_value = item.value  # ユーザーから送られてくる生のデータ

            # マスタ情報の取得
            attr_meta = attributes_map.get(key)
            is_encrypted = attr_meta.encrypted if attr_meta else False

            # 更新または新規作成の判定
            existing = (
                db.query(UserOption)
                .filter(UserOption.user_id == user_id, UserOption.key == key)
                .first()
            )

            if existing:
                # 既存のレコードを更新する場合
                if is_encrypted:
                    # 暗号化して格納
                    existing.encrypted_value = encrypt_value(raw_value)
                    existing.value = None  # 明文をクリア
                else:
                    # 暗号化せずに格納
                    existing.value = raw_value
                    existing.encrypted_value = None  # 暗号文をクリア
                processed_items.append(existing)
            else:
                # 新規作成する場合
                if is_encrypted:
                    # 暗号化して格納
                    new_opt = UserOption(
                        user_id=user_id,
                        key=key,
                        encrypted_value=encrypt_value(raw_value),
                    )
                else:
                    # 暗号化せずに格納
                    new_opt = UserOption(user_id=user_id, key=key, value=raw_value)
                db.add(new_opt)
                processed_items.append(new_opt)

        db.commit()
        # レスポンス用に UserOptionOut に変換
        results = []
        for opt in processed_items:
            attr_meta = attributes_map.get(opt.key)
            final_value = opt.value
            if attr_meta and attr_meta.encrypted and opt.encrypted_value:
                final_value = decrypt_value(opt.encrypted_value)

            results.append(UserOptionOut(key=opt.key, value=final_value))

        # 更新後のアイテムを返す
        logger.debug(
            "Successfully updated/created items for user_id=%s: %s", user_id, results
        )
        return results
