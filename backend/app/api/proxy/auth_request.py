from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User
from app.services.session_service import SessionService
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/proxy", tags=["proxy"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/auth-request")
def auth_request(request: Request, response: Response, db: Session = Depends(get_db)):
    # Cookie からセッションIDを取得
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No session"
        )

    # セッション検証
    session = SessionService.validate_session(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session"
        )

    # ユーザ取得
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    # nginx に渡すヘッダ
    response.headers["X-User"] = user.email

    return {"ok": True}
