"""
リクエストに関連する情報の解決を行うユーティリティモジュール。
プロキシ経由のIPアドレスの取得や、セッション情報からのユーザーID取得などを処理します。
"""
from app.db.session import SessionLocal
from app.services.session_service import SessionService
from fastapi import Request

def resolve_client_ip(request: Request) -> str:
    """
    プロキシ配下を考慮してクライアントIPを解決する。
    """
    # X-Forwarded-Forヘッダーを確認（プロキシ経由の場合のオリジンIPを取得）
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # 複数のIPが含まれている場合、最初の要素を抽出
        return forwarded_for.split(",", maxsplit=1)[0].strip()

    # 直接接続の場合、request.clientからホスト情報を取得
    if request.client is None:
        return "unknown"

    return request.client.host


def resolve_request_user_id(request: Request) -> str | None:
    """
    セッションクッキーからアクセス主体の user_id を解決する。
    """
    # クッキーからセッションIDを取得
    session_id = request.cookies.get("simpleauth_session")
    if not session_id:
        return None

    db = SessionLocal()
    try:
        # データベースと連携してセッションを検証
        session = SessionService.validate_session(db, session_id)
        if session is None:
            return None

        # 有効なセッションであればユーザーIDを文字列として返す
        return str(session.user_id)
    finally:
        # 処理完了後、またはエラー発生時に必ずセッションを閉じる
        db.close()
