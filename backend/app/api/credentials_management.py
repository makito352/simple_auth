from app.core.config import logger, settings
from app.db.session import get_db
from app.schemas.auth import CredentialCommentUpdateRequest, CredentialOut
from app.services.webauthn_service import WebAuthnService
from app.services.session_service import SessionService
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from uuid import UUID

router = APIRouter(prefix="/webauthn", tags=["webauthn"])

def get_current_user_id(request: Request, db: Session) -> UUID:
    """
    セッションクッキーから現在のユーザーIDを取得する。
    """
    session_id = request.cookies.get("simpleauth_session")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    session = SessionService.validate_session(db, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    return session.user_id

@router.get("/credentials", response_model=list[CredentialOut])
def list_credentials(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    ログイン中ユーザーに紐づくWebAuthn資格情報一覧を返す。
    """
    current_user_id = get_current_user_id(request, db)
    credentials = WebAuthnService.get_credentials(db, current_user_id)
    return credentials


@router.patch("/credentials/{credential_id}/comment", status_code=status.HTTP_204_NO_CONTENT)
def update_credential_comment(
    credential_id: str,
    payload: CredentialCommentUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    ログイン中ユーザーが自身の資格情報コメントを更新する。
    """
    current_user_id = get_current_user_id(request, db)
    credential = WebAuthnService.get_by_credential_id_and_user_id(
        db,
        credential_id,
        current_user_id,
    )
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found",
        )

    WebAuthnService.update_credential_comment(db, credential_id, payload.comment)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/credentials/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credential(
    credential_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    ログイン中ユーザーが自身の資格情報を削除する。
    """
    current_user_id = get_current_user_id(request, db)
    credential = WebAuthnService.get_by_credential_id_and_user_id(
        db,
        credential_id,
        current_user_id,
    )
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found",
        )

    WebAuthnService.delete_credential(db, credential_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
