from typing import List
from uuid import UUID

from app.db.session import get_db
from app.schemas.user_option import (OptionAttributeOut, UserOptionBulkUpdate,
                                     UserOptionOut)
from app.services.user_option_service import UserOptionService
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/user-options", tags=["user-options"])

# --- マスタ操作系 (Admin用) ---


@router.get("/attributes", response_model=list[OptionAttributeOut])
def list_attributes(db: Session = Depends(get_db)):
    return UserOptionService.get_all_attributes(db)


@router.post("/attributes", status_code=status.HTTP_201_CREATED)
def create_attribute(db: Session = Depends(get_db), data: dict = None):
    # 実際にはスキーマを介する
    return UserOptionService.create_attribute(db, data)


@router.put("/attributes/{attr_id}")
def update_attribute(attr_id: UUID, db: Session = Depends(get_db), data: dict = None):
    """
    既存の属性を更新する。
    データが存在しない場合は 404 Not Found を返す。
    """
    updated_attr = UserOptionService.update_attribute(db, attr_id, data or {})
    if not updated_attr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found"
        )
    return updated_attr


@router.delete("/attributes/{attr_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attribute(attr_id: UUID, db: Session = Depends(get_db)):
    UserOptionService.delete_attribute(db, attr_id)
    return None


# --- データ操作系 (ユーザー個別) ---


@router.patch("/{user_id}/options", response_model=list[UserOptionOut])
def update_user_options(
    user_id: UUID, options_in: UserOptionBulkUpdate, db: Session = Depends(get_db)
):
    """
    【Bulk Update】
    特定ユーザーの複数のオプションを一括更新。
    例: GET /user-options/123-abc/options に list[{"key": "imap", "value": "..."}, ...] を送る
    """
    return UserOptionService.bulk_update_user_options(
        db, user_id, [o.dict() for o in options_in.options]
    )


@router.get("/{user_id}/options")
def get_user_options(user_id: UUID, db: Session = Depends(get_db)):
    return UserOptionService.get_user_options(db, user_id)
