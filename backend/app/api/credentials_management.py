"""
WebAuthn資格情報の管理に関するAPIエンドポイント。

このモジュールは、ログイン中のユーザーに関連付けられたWebAuthn資格情報の
一覧取得、コメントの更新、および削除の処理を提供します。
"""

from uuid import UUID

from app.core.config import logger
from app.db.session import get_db
from app.schemas.auth import CredentialCommentUpdateRequest, CredentialOut
from app.services.session_service import SessionService
from app.services.webauthn_service import WebAuthnService
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/webauthn", tags=["webauthn"])


def get_current_user_id(request: Request, db: Session) -> UUID:
    """
    セッションクッキーから現在のユーザーIDを取得する。
    """
    session_id = request.cookies.get("simpleauth_session")
    if not session_id:
        logger.debug("No session cookie found in request.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    session = SessionService.validate_session(db, session_id)
    if session is None:
        logger.debug("Invalid or expired session for session_id=%s", session_id)
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


@router.patch(
    "/credentials/{credential_id}/comment", status_code=status.HTTP_204_NO_CONTENT
)
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

    # 資格情報が見つからない場合は404を返す
    if credential is None:
        logger.debug(
            "Credential not found for credential_id=%s and user_id=%s",
            credential_id,
            current_user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found",
        )

    # WebAuthn資格情報のコメントを更新する
    WebAuthnService.update_credential_comment(db, credential_id, payload.comment)
    logger.debug(
        "Credential comment updated for credential_id=%s and user_id=%s",
        credential_id,
        current_user_id,
    )

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

    # 資格情報が見つからない場合は404を返す
    if credential is None:
        logger.debug(
            "Credential not found for credential_id=%s and user_id=%s",
            credential_id,
            current_user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found",
        )

    # WebAuthn資格情報を削除する
    WebAuthnService.delete_credential(db, credential_id)
    logger.debug(
        "Credential deleted for credential_id=%s and user_id=%s",
        credential_id,
        current_user_id,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
