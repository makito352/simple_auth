from app.db.session import get_db
from app.models.oidc import ValueSourceType
from app.schemas.oidc import ClaimMappingCreate, ClaimMappingResponse
from app.services.oidc_service import OidcClaimService
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/admin_oidc", tags=["OIDC Management"])


def _get_mapping_or_400(db: Session, mapping_id: str):
    try:
        mapping = OidcClaimService.get_claim_mapping_by_id(db, mapping_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    return mapping


@router.get("/mappings", response_model=list[ClaimMappingResponse])
def list_claim_mappings(db: Session = Depends(get_db)):
    """すべてのマッピングルールを取得する"""
    mappings = OidcClaimService.get_all_claim_mappings(db)
    return mappings


@router.get("/mappings/{mapping_id}", response_model=ClaimMappingResponse)
def get_claim_mapping(mapping_id: str, db: Session = Depends(get_db)):
    """特定のIDのマッピングを取得する"""
    return _get_mapping_or_400(db, mapping_id)


@router.post("/mappings", response_model=ClaimMappingResponse)
def create_claim_mapping(data: ClaimMappingCreate, db: Session = Depends(get_db)):
    """新しいマッピングルールを作成する"""
    new_mapping = OidcClaimService.create_claim_mapping(db, data=data)
    return new_mapping


@router.put("/mappings/{mapping_id}", response_model=ClaimMappingResponse)
def update_claim_mapping(
    mapping_id: str, data: ClaimMappingCreate, db: Session = Depends(get_db)
):
    """既存のマッピングを更新する"""
    mapping = _get_mapping_or_400(db, mapping_id)

    # スキーマのデータを用いて更新
    mapping.scope = data.scope
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


@router.delete("/mappings/{mapping_id}", status_code=204)
def delete_claim_mapping(mapping_id: str, db: Session = Depends(get_db)):
    """マッピングを削除する"""
    mapping = _get_mapping_or_400(db, mapping_id)

    db.delete(mapping)
    db.commit()
    return None
