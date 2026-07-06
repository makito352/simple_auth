from uuid import UUID

from app.models.user_option import UserOption, UserOptionAttribute
from app.schemas.user_option import OptionAttributeOut, UserOptionOut, UserOptionBulkUpdate
from app.utils.crypto import decrypt_value, encrypt_value
from sqlalchemy.orm import Session
from app.core.config import logger

class UserOptionService:
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
        new_attr = UserOptionAttribute(**attrs)
        db.add(new_attr)
        db.commit()
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
            # 存在しない場合はNoneを返すか、例外を投げる（API側でハンドリングするため）
            return None

        for key, value in data.items():
            if hasattr(attr, key):
                setattr(attr, key, value)

        db.commit()
        db.refresh(attr)
        return attr

    @staticmethod
    def delete_attribute(db: Session, attr_id: UUID):
        attr = (
            db.query(UserOptionAttribute)
            .filter(UserOptionAttribute.id == attr_id)
            .first()
        )
        if attr:
            db.delete(attr)
            db.commit()

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
        logger.debug("Bulk updating user options for user_id=%s optionslen=%d options=%s", user_id, len(options), options)    

        # 効率のためマスタ情報を一括取得して辞書化
        attributes_map = {
            attr.key: attr for attr in db.query(UserOptionAttribute).all()
        }

        processed_items  = []
        for item in options:
            key =  item.key
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
                processed_items .append(existing)
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
                    new_opt = UserOption(
                        user_id=user_id, 
                        key=key, 
                        value=raw_value
                    )
                db.add(new_opt)
                processed_items .append(new_opt)

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
        logger.debug("Successfully updated/created items for user_id=%s: %s", user_id, results)
        return results
