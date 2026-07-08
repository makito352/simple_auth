"""
【管理者向け】
ユーザーオプション関連のAPIエンドポイントを提供するモジュール。
このモジュールでは、ユーザーオプションの作成、取得、更新、削除の処理を行います。
"""

from uuid import UUID

from app.api.current_user import get_current_admin_user
from app.core.config import logger
from app.db.session import get_db
from app.schemas.user_option import (
    OptionAttributeOut,
    UserOptionBulkUpdate,
    UserOptionOut,
)
from app.services.user_option_service import UserOptionService
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/user-options", tags=["user-options"])


@router.get("/attributes", response_model=list[OptionAttributeOut])
def list_attributes(
    db: Session = Depends(get_db), _admin=Depends(get_current_admin_user)
):
    """
    【管理者向け】
    すべての属性を取得する。
    """
    return UserOptionService.get_all_attributes(db)


@router.post("/attributes", status_code=status.HTTP_201_CREATED)
def create_attribute(
    db: Session = Depends(get_db),
    data: dict = None,
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    新しい属性を作成する。
    """
    return UserOptionService.create_attribute(db, data)


@router.put("/attributes/{attr_id}")
def update_attribute(
    attr_id: UUID,
    db: Session = Depends(get_db),
    data: dict = None,
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    既存の属性を更新する。
    データが存在しない場合は 404 Not Found を返す。
    """
    updated_attr = UserOptionService.update_attribute(db, attr_id, data or {})
    if not updated_attr:
        logger.debug("Attribute with ID %s not found for update.", attr_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found"
        )
    return updated_attr


@router.delete("/attributes/{attr_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attribute(
    attr_id: UUID, db: Session = Depends(get_db), _admin=Depends(get_current_admin_user)
):
    """
    【管理者向け】
    既存の属性を削除する。
    データが存在しない場合は 404 Not Found を返す。
    """
    UserOptionService.delete_attribute(db, attr_id)
    return None


@router.patch("/{user_id}/options", response_model=list[UserOptionOut])
def update_user_options(
    user_id: UUID,
    options_in: UserOptionBulkUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    特定ユーザーの複数のオプションを一括更新。
    """
    return UserOptionService.bulk_update_user_options(db, user_id, options_in.options)


@router.get("/{user_id}/options", response_model=list[UserOptionOut])
def get_user_options(
    user_id: UUID, db: Session = Depends(get_db), _admin=Depends(get_current_admin_user)
):
    """
    【管理者向け】
    特定ユーザーのすべてのオプションを取得する。
    """
    return UserOptionService.get_user_options(db, user_id)
