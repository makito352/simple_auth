"""
【管理者向け】
OIDC（OpenID Connect）連携管理用API。
外部アプリケーションとの認証・認可を橋渡しするための設定を提供します。

- スコープ(Scopes): 外部アプリに許可する情報の範囲を定義。
- クレーム(Claims): 特定の情報を外部システムへ渡すためのマッピング。
- クライアント(Clients): 個別の接続先アプリケーションの登録と認証キー管理。
"""

from app.api.current_user import get_current_admin_user
from app.db.session import get_db
from app.schemas.oidc import (
    ClaimMappingCreate,
    ClaimMappingResponse,
    OidcClientActivationUpdate,
    OidcClientCreate,
    OidcClientResponse,
    OidcClientSecretResponse,
    OidcClientUpdate,
    OidcScopeCreate,
    OidcScopeResponse,
    OidcScopeUpdate,
)
from app.services.oidc_service import (
    OidcClaimService,
    OidcClientService,
    OidcScopeService,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/admin_oidc", tags=["OIDC Management"])


def _get_mapping_or_400(db: Session, mapping_id: str):
    """
    指定されたIDのマッピングを取得する。
    見つからない場合や無効な場合は適切なHTTP例外をスローする。
    """
    try:
        mapping = OidcClaimService.get_claim_mapping_by_id(db, mapping_id)
    except ValueError as exc:
        # サービス層からのバリデーションエラーを400に変換
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not mapping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapping not found")

    return mapping


def _handle_client_service_error(exc: ValueError) -> None:
    """
    OidcClientServiceからのエラーを適切なHTTPステータスコードに変換する。
    """
    message = str(exc)
    if message in {"invalid_client", "client not found"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message) from exc


def _handle_scope_service_error(exc: ValueError) -> None:
    """
    OidcScopeServiceからのエラーを適切なHTTPステータスコードに変換する。
    """
    message = str(exc)
    if message == "scope not found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
    if message == "scope is in use":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message) from exc
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message) from exc


@router.get("/mappings", response_model=list[ClaimMappingResponse])
def list_claim_mappings(
    db: Session = Depends(get_db), _admin=Depends(get_current_admin_user)
):
    """
    【管理者向け】
    すべてのマッピングを取得する。
    """
    mappings = OidcClaimService.get_all_claim_mappings(db)
    return mappings


@router.get("/mappings/{mapping_id}", response_model=ClaimMappingResponse)
def get_claim_mapping(
    mapping_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    特定のIDのマッピングを取得する。
    """
    return _get_mapping_or_400(db, mapping_id)


@router.post("/mappings", response_model=ClaimMappingResponse)
def create_claim_mapping(
    data: ClaimMappingCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    新しいマッピングを作成する。
    """
    try:
        new_mapping = OidcClaimService.create_claim_mapping(db, data=data)
    except ValueError as exc:
        _handle_scope_service_error(exc)
    return new_mapping


@router.put("/mappings/{mapping_id}", response_model=ClaimMappingResponse)
def update_claim_mapping(
    mapping_id: str,
    data: ClaimMappingCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    既存のマッピングを更新する。
    """
    try:
        return OidcClaimService.update_claim_mapping(db, mapping_id, data)
    except ValueError as exc:
        message = str(exc)
        if message == "mapping not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
        _handle_scope_service_error(exc)


@router.delete("/mappings/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_claim_mapping(
    mapping_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    マッピングを削除する。
    """
    mapping = _get_mapping_or_400(db, mapping_id)

    db.delete(mapping)
    db.commit()
    return None


@router.get("/scopes", response_model=list[OidcScopeResponse])
def list_oidc_scopes(
    db: Session = Depends(get_db), _admin=Depends(get_current_admin_user)
):
    """
    【管理者向け】
    OIDCクライアントに割り当て可能なスコープ一覧を取得する。
    """
    return OidcScopeService.list_scopes(db)


@router.post("/scopes", response_model=OidcScopeResponse)
def create_oidc_scope(
    data: OidcScopeCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    OIDCスコープを作成する。
    """
    try:
        scope = OidcScopeService.create_scope(db, data)
    except ValueError as exc:
        _handle_scope_service_error(exc)
    return OidcScopeService.to_response_dict(db, scope)


@router.put("/scopes/{scope_name}", response_model=OidcScopeResponse)
def update_oidc_scope(
    scope_name: str,
    data: OidcScopeUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    OIDCスコープの説明を更新する。
    """
    try:
        scope = OidcScopeService.update_scope(db, scope_name, data)
    except ValueError as exc:
        _handle_scope_service_error(exc)
    return OidcScopeService.to_response_dict(db, scope)


@router.delete("/scopes/{scope_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_oidc_scope(
    scope_name: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    OIDCスコープを削除する。
    """
    try:
        OidcScopeService.delete_scope(db, scope_name)
    except ValueError as exc:
        _handle_scope_service_error(exc)
    return None


@router.get("/clients", response_model=list[OidcClientResponse])
def list_oidc_clients(
    db: Session = Depends(get_db), _admin=Depends(get_current_admin_user)
):
    """
    【管理者向け】
    OIDCクライアント一覧を取得する。
    """
    return OidcClientService.list_clients(db)


@router.get("/clients/{client_id}", response_model=OidcClientResponse)
def get_oidc_client(
    client_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    OIDCクライアント詳細を取得する。
    """
    client = OidcClientService.get_client_by_client_id(db, client_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="client not found")
    return OidcClientService.to_response_dict(db=db, client=client)


@router.post("/clients", response_model=OidcClientSecretResponse)
def create_oidc_client(
    data: OidcClientCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    OIDCクライアントを作成する。
    """
    try:
        client, plain_secret = OidcClientService.create_client(db, data)
    except ValueError as exc:
        _handle_client_service_error(exc)
    return OidcClientService.to_response_dict(
        db=db,
        client=client,
        include_plain_secret=plain_secret,
    )


@router.put("/clients/{client_id}", response_model=OidcClientResponse)
def update_oidc_client(
    client_id: str,
    data: OidcClientUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    OIDCクライアントを更新する。
    """
    try:
        client = OidcClientService.update_client(db, client_id, data)
    except ValueError as exc:
        _handle_client_service_error(exc)
    return OidcClientService.to_response_dict(db=db, client=client)


@router.post(
    "/clients/{client_id}/rotate-secret", response_model=OidcClientSecretResponse
)
def rotate_oidc_client_secret(
    client_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    OIDCクライアントのシークレットを再発行する。
    """
    try:
        client, plain_secret = OidcClientService.rotate_client_secret(db, client_id)
    except ValueError as exc:
        _handle_client_service_error(exc)
    return OidcClientService.to_response_dict(
        db=db,
        client=client,
        include_plain_secret=plain_secret,
    )


@router.patch("/clients/{client_id}/active", response_model=OidcClientResponse)
def update_oidc_client_active(
    client_id: str,
    data: OidcClientActivationUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    【管理者向け】
    OIDCクライアントの有効状態を変更する。
    """
    try:
        client = OidcClientService.set_client_active(db, client_id, data.is_active)
    except ValueError as exc:
        _handle_client_service_error(exc)
    return OidcClientService.to_response_dict(db=db, client=client)
