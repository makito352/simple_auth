"""
OIDC (OpenID Connect) のエンドポイントを提供する FastAPI ルーター。
このモジュールでは、OIDC の認可コードフローに必要なエンドポイントを実装しています。
"""

import time
from datetime import datetime, timezone
from typing import Optional

from app.api.current_user import get_current_user
from app.core.config import logger, settings
from app.db.session import get_db
from app.schemas.oidc_auth import (
    JwkKey,
    JwksResponse,
    OpenIdConfigurationResponse,
    TokenRequest,
    TokenResponse,
    UserInfoResponse,
)
from app.services.oidc_auth_flow_service import OidcAuthFlowService
from app.services.oidc_service import OidcClaimService, OidcClientService
from app.services.user_service import UserService
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from jose import ExpiredSignatureError, JWTError, jwt
from jwcrypto import jwk
from pydantic import ValidationError
from sqlalchemy.orm import Session

router = APIRouter(prefix="/oidc", tags=["oidc"])


# ----------------------------
# OpenID Provider Metadata
# ----------------------------
@router.get(
    "/.well-known/openid-configuration", response_model=OpenIdConfigurationResponse
)
def openid_configuration(db: Session = Depends(get_db)) -> OpenIdConfigurationResponse:
    """
    ログイン前でもアクセス可能なエンドポイント。
    OpenID Provider Metadata を返す。
    """
    # 開始ログ
    logger.debug("OpenID Configuration requested")

    issuer = f"{str(settings.BACKEND_BASE_URI).rstrip('/')}/oidc"
    scope_names = [scope.scope_name for scope in OidcClientService.get_all_scopes(db)]
    supported_scopes = sorted(set(["openid", *scope_names]))

    return OpenIdConfigurationResponse(
        issuer=issuer,
        authorization_endpoint=f"{issuer}/authorize",
        token_endpoint=f"{issuer}/token",
        userinfo_endpoint=f"{issuer}/userinfo",
        jwks_uri=f"{issuer}/jwks.json",
        response_types_supported=["code"],
        subject_types_supported=["public"],
        id_token_signing_alg_values_supported=[settings.OIDC_JWT_ALG],
        scopes_supported=supported_scopes,
        token_endpoint_auth_methods_supported=["client_secret_post"],
    )


@router.get("/jwks.json", response_model=JwksResponse)
def jwks() -> JwksResponse:
    """
    ログイン前でもアクセス可能なエンドポイント。
    JSON Web Key Set (JWKS) を返す。
    """
    logger.debug("jwks.json called")

    # settings.OIDC_JWT_PUBLIC_KEY は PEM 形式の公開鍵文字列を想定
    public_key_pem = settings.OIDC_JWT_PUBLIC_KEY

    # JWK オブジェクトを生成
    key = jwk.JWK.from_pem(public_key_pem.encode("utf-8"))

    # kid を自動生成（公開鍵の fingerprint）
    key_thumbprint = key.thumbprint()

    # kid を設定
    key_dict = key.export(as_dict=True)
    key_dict["kid"] = key_thumbprint
    key_dict["use"] = "sig"
    key_dict["alg"] = "RS256"

    return JwksResponse(keys=[JwkKey.model_validate(key_dict)])


# ----------------------------
# /authorize
# ----------------------------
@router.get("/authorize")
def authorize(
    request: Request,
    response_type: str,
    client_id: str,
    redirect_uri: str,
    scope: str,
    state: Optional[str] = None,
    nonce: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    ログイン後のユーザー向けエンドポイント。
    OIDC 認可コードフローの認可リクエストを処理する。
    """
    # 開始ログ
    logger.debug("authorize called")
    logger.debug("scope: %s", scope)

    # リクエストパラメータの検証
    if response_type != "code":
        raise HTTPException(status_code=status.HTTP_status.HTTP_400_BAD_REQUEST_BAD_REQUEST, detail="unsupported_response_type")

    # scope をスペース区切りで分割してリスト化
    requested_scopes = scope.split(" ") if isinstance(scope, str) else []
    try:
        # OIDC クライアントの client_id, redirect_uri, scope を検証
        OidcClientService.validate_authorize_request(
            db=db,
            client_id=client_id,
            redirect_uri=redirect_uri,
            requested_scope_names=requested_scopes,
        )
    except ValueError as exc:
        # 検証失敗時のログを出力
        logger.debug(
            "Validation failed for client %s with redirect_uri %s",
            client_id,
            redirect_uri,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    try:
        user = get_current_user(request, db)
    except HTTPException as exc:
        # 認可画面で未ログインの場合、status.HTTP_401_UNAUTHORIZEDではなくログイン画面へリダイレクトさせたい場合は
        # ここでキャッチしてRedirectResponseを返す処理を入れるか、
        # もしくはフロントエンド側で「セッションなしならログインへ」を制御します。
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            login_url = f"/login?next={request.url}"
            return RedirectResponse(url=login_url)
        raise exc

    # 認可コードを発行して保存する
    auth_code = OidcAuthFlowService.issue_auth_code(
        db=db,
        client_id=client_id,
        redirect_uri=redirect_uri,
        scope=scope,
        user_id=user.id,
    )
    code = auth_code.code

    # state をそのまま返す
    redirect = f"{redirect_uri}?code={code}"
    if state:
        redirect += f"&state={state}"
    return RedirectResponse(url=redirect)


# ----------------------------
# /token
# ----------------------------
@router.post("/token")
async def token(
    grant_type: str = Form(...),
    code: str = Form(...),
    redirect_uri: str = Form(...),
    client_id: str = Form(...),
    client_secret: Optional[str] = Form(None),
    db: Session = Depends(get_db),
) -> TokenResponse:

    # 開始ログ
    logger.debug("token called")

    # フォーム入力をスキーマに通して、入力仕様を API とコード上で一致させる
    try:
        token_request = TokenRequest(
            grant_type=grant_type,
            code=code,
            redirect_uri=redirect_uri,
            client_id=client_id,
            client_secret=client_secret,
        )
    except ValidationError as exc:
        logger.debug("Token request validation failed")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_request") from exc

    grant_type = token_request.grant_type
    code = token_request.code
    redirect_uri = token_request.redirect_uri
    client_id = token_request.client_id
    client_secret = token_request.client_secret

    if grant_type != "authorization_code":
        logger.debug("Unsupported grant_type: %s", grant_type)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unsupported_grant_type")

    try:
        # OIDC クライアントの client_id と client_secret を検証
        OidcClientService.validate_token_client(db, client_id, client_secret)
    except ValueError as exc:
        logger.debug("Client validation failed for client_id %s", client_id)
        raise HTTPException(status_code=status.HTTP_status.HTTP_401_UNAUTHORIZED_UNAUTHORIZED, detail=str(exc)) from exc

    # 認可コードを取得し、クライアントとの組み合わせを検証する
    auth_code = OidcAuthFlowService.find_auth_code_for_token_exchange(
        db=db,
        code=code,
        client_id=client_id,
    )
    if not auth_code:
        logger.debug("Authorization code not found or does not match client_id")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_grant")

    if not OidcAuthFlowService.is_redirect_uri_match(auth_code, redirect_uri):
        logger.debug(
            "Redirect URI mismatch: expected %s, got %s",
            auth_code.redirect_uri,
            redirect_uri,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_grant")

    user = UserService.read_user(db=db, user_id=auth_code.user_id)
    if not user:
        logger.debug("User %s not found", auth_code.user_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_grant")

    # スコープ
    requested_scopes = auth_code.scope

    # 一度使ったコードは削除
    OidcAuthFlowService.consume_auth_code(db=db, auth_code=auth_code)

    now = int(time.time())
    exp = now + 3600
    exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc)

    issuer = f"{str(settings.BACKEND_BASE_URI).rstrip('/')}/oidc"
    subject = str(user.id)

    id_token_claims = {
        "iss": issuer,
        "sub": subject,
        "aud": client_id,
        "iat": now,
        "exp": exp,
        "email": user.email,
        "name": user.email,  # 必要なら別の属性
    }

    id_token = jwt.encode(
        id_token_claims,
        settings.OIDC_JWT_PRIVATE_KEY,
        algorithm=settings.OIDC_JWT_ALG,
    )

    # アクセストークンの発行
    logger.debug("requested_scopes=%s ", requested_scopes)
    access_token = jwt.encode(
        {
            "sub": str(user.id),
            "scope": requested_scopes,
            "exp": time.time() + 3600,
        },
        settings.OIDC_JWT_PRIVATE_KEY,
        algorithm="RS256",
    )

    OidcAuthFlowService.store_access_token(
        db=db,
        token=access_token,
        user_id=user.id,
        expires_at=exp_dt,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="Bearer",
        expires_in=3600,
        id_token=id_token,
    )


# ----------------------------
# /userinfo
# ----------------------------
@router.get("/userinfo", response_model=UserInfoResponse)
def userinfo(request: Request, db: Session = Depends(get_db)) -> UserInfoResponse:

    # 開始ログ
    logger.debug("userinfo called")

    # Authorization: Bearer <token>
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        logger.debug("No Authorization header")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not_authenticated")

    token = auth.split(" ")[1]

    # DB からアクセストークンを検索
    token_row = OidcAuthFlowService.find_access_token(db=db, token=token)

    if not token_row:
        logger.debug("Access token not found")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not_authenticated")

    # 有効期限チェック
    if OidcAuthFlowService.is_access_token_expired(token_row):
        logger.debug("Access token expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_expired")

    user = UserService.read_user(db=db, user_id=token_row.user_id)
    if not user:
        logger.debug("User not found")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not_authenticated")

    # tokenからクレームを取得し、不正トークンは認証失敗として扱う
    try:
        payload = jwt.decode(
            token,
            settings.OIDC_JWT_PUBLIC_KEY,
            algorithms=["RS256"],
        )
    except ExpiredSignatureError as exc:
        logger.debug("Access token JWT expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_expired") from exc
    except JWTError as exc:
        logger.debug("Access token JWT validation failed: %s", str(exc))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not_authenticated") from exc

    scope = payload.get("scope", "")
    scopes = scope.split(" ") if isinstance(scope, str) else []
    logger.debug("scope=%s, scopes=%s", scope, scopes)

    # 基本情報をモデルとして構築する
    response = UserInfoResponse(
        sub=str(user.id),
        email=user.email,
        email_verified=True,
        name=user.email,
        preferred_username=user.email,
    )

    # OidcClaimService を利用して動的なマッピングを適用
    dynamic_claims = OidcClaimService.resolve_claims(
        db=db, requested_scopes=scopes, user_id=token_row.user_id
    )
    if dynamic_claims:
        response = response.model_copy(update=dynamic_claims)

    # OIDC認証問題が発生した場合用に、ログに出力
    logger.debug("userinfo response: %s", response)
    return response
