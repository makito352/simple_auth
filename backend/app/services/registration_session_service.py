"""
本セッショントークンは、一時的なトークンです。
そのため、UUIDを使用して一意性を確保しています。
"""

import uuid
from datetime import datetime, timedelta, timezone

from app.models.registration_session import RegistrationSession
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Session

# トークン有効期間は5分の定数定義
TOKEN_VALIDITY_PERIOD = 5


def generate_token(db: Session, user_id):
    """
    指定されたユーザーIDに対して新しい登録トークンを生成し、データベースに保存します。

    :param db: SQLAlchemyのセッション
    :param user_id: ユーザーのUUID
    :return: 新しい登録トークン（文字列）
    """
    # 新しい登録セッションを作成
    token = str(uuid.uuid4())
    expires_at = datetime.now() + timedelta(hours=24)

    new_session = RegistrationSession(
        user_id=user_id, session_token=token, expires_at=expires_at
    )

    db.add(new_session)
    db.commit()

    return token


def validate_token(db: Session, token) -> UUID:
    """
    登録トークンの検証を行います。

    :param db: SQLAlchemyのセッション
    :param token: 検証する登録トークン
    :return: user_id です。
    """
    # データベースから登録セッションを検索
    session = (
        db.query(RegistrationSession)
        .filter_by(
            session_token=token,
        )
        .first()
    )

    if not session:
        return None
    # used_atが未設定の場合、OK
    if session.used_at is None:
        return session.user_id

    # used_atが5分以内の場合、OK
    five_minutes_ago = datetime.now(timezone.utc) - timedelta(
        minutes=TOKEN_VALIDITY_PERIOD
    )
    if session.used_at > five_minutes_ago:
        return session.user_id

    # used_atが5分以上経っている場合、NG
    return None


def save_challenge(db: Session, token, challenge) -> bool:
    """
    指定されたトークンに対応するチャレンジを保存します。

    :param db: SQLAlchemyのセッション
    :param token: 登録トークン
    :param challenge: 保存するチャレンジ（バイナリデータ）
    :return: 成功したかどうか（True or False）
    """
    # データベースから登録セッションを検索
    session = (
        db.query(RegistrationSession)
        .filter_by(
            session_token=token,
        )
        .first()
    )

    if not session:
        return False

    # challenge を保存
    session.challenge = challenge
    db.commit()

    return True


def get_challenge(db: Session, token) -> bytes | None:
    """
    指定されたトークンに対応するチャレンジを取得します。

    :param db: SQLAlchemyのセッション
    :param token: 登録トークン
    :return: チャレンジ（バイナリデータ）または None （トークンが存在しない場合）
    """
    # データベースから登録セッションを検索
    session = (
        db.query(RegistrationSession)
        .filter_by(
            session_token=token,
        )
        .first()
    )

    if not session:
        return None

    return session.challenge
