# backend/app/api/auth/otp.py
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.config import logger
from app.core.email import send_otp_email
from app.db.session import SessionLocal
from app.schemas.auth import StartAuthRequest, VerifyOTPRequest
from app.services.otp_service import OTPService
from app.services.registration_session_service import generate_token, validate_token
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.options("/start")
async def options_auth_start():
    return {}


@router.post(
    "/start",
    status_code=200,  # 成功時のデフォルトステータス
    responses={
        200: {
            "description": "OTP sent successfully",
        },
        409: {
            "description": "User already exists",
        },
    },
)
def start_auth(
    payload: StartAuthRequest, response: Response, db: Session = Depends(get_db)
):
    # 開始ログ
    logger.info("OTP start request received", extra={"email": payload.email})

    try:
        user = UserService.create_user(db, email=payload.email)

    except ValueError as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=409, detail=str(e))

    # OTP発行
    otp = OTPService.create_otp(db, user.id)

    # メール送信
    send_otp_email(to=user.email, code=otp.code)

    session_token = generate_token(db, user.id)

    logger.debug("OTP メール送信: %s, session_token=%s", user.email, session_token)
    # セッション作成
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=300,
        path="/",
    )

    # 成功は 200 OK、本文なしとしたいが、とりあえずOKを返す
    return {"ok": True}


@router.options("/verify-otp")
async def options_verify_otp():
    return {}


@router.post("/verify-otp")
def verify_otp(
    payload: VerifyOTPRequest, request: Request, db: Session = Depends(get_db)
):

    logger.debug("verify_otp payload:%s", payload)

    session_token = request.cookies.get("session_token")
    if not session_token:
        logger.error("session_token is missing")
        raise HTTPException(status_code=400, detail="Session token missing")

    # session_token → user_id を復元
    user_id = validate_token(db, session_token)
    if not user_id:
        logger.error("session_token 不正")
        raise HTTPException(status_code=400, detail="Invalid or expired session")

    ok = OTPService.verify_otp(db, user_id, payload.code)
    if not ok:
        logger.error(f"OTP 不正: user_id={user_id}")
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # メール認証済みにする
    user = UserService.update_user_email_verification(db, user_id)
    logger.info(f"メール認証完了: {user.email}")

    return {"ok": True, "user_id": str(user_id)}
