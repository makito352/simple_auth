from datetime import datetime, timedelta, timezone

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Session

from app.core.config import logger
from app.models.user import User

class UserService:

    @staticmethod
    def create_user(db: Session, email: str) -> User:
        """
        新しいユーザーを作成します。
        """
        existing_user = db.query(User).filter(User.email == email).first()

        if existing_user:
            if existing_user.email_verification_status in ["pending", "verified"]:
                logger.error(f"User with email {email} is already pending or verified.")
                raise ValueError("Email already exists and is pending or verified.")

            elif existing_user.email_verification_status in ["expired", "disabled"]:
                existing_user.email_verification_status = "pending"
                existing_user.email_verified_at = None
                existing_user.email_verification_expires_at = datetime.now(timezone.utc) + timedelta(
                    days=1
                )
                db.commit()
                db.refresh(existing_user)
                return existing_user

        new_user = User(
            email=email,
            email_verification_status="pending",
            email_verified_at=None,
            email_verification_expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def read_user(db: Session, user_id: UUID) -> User:
        """
        特定のユーザーIDを持つユーザーを読み込みます。
        email_verification_statusによる値で処理を分けます。
        verifiedの場合は、OK
        pendingの場合は、User.email_verification_expires_at > datetime.now(timezone.utc)であること。
        expired、disabledはNG
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        if user.email_verification_status == "verified":
            return user
        elif user.email_verification_status == "pending":
            if user.email_verification_expires_at > datetime.now(timezone.utc):
                return user
            else:
                logger.error(f"User with email {user.email} has expired verification.")
                raise ValueError("Email verification has expired.")
        elif user.email_verification_status in ["expired", "disabled"]:
            logger.error(f"User with email {user.email} is disabled or expired.")
            raise ValueError("User is disabled or expired.")

    @staticmethod
    def read_user_by_email(db: Session, email: str) -> User | None:
        """
        特定のメールアドレスを持つユーザーを読み込みます。
        email_verification_statusによる値で処理を分けます。
        verifiedの場合は、OK
        pendingの場合は、User.email_verification_expires_at > datetime.now(timezone.utc)であること。
        expired、disabledはNG
        """
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None

        if user.email_verification_status == "verified":
            return user
        elif user.email_verification_status == "pending":
            if user.email_verification_expires_at > datetime.now(timezone.utc):
                return user
            else:
                logger.error(f"User with email {user.email} has expired verification.")
                return None
        elif user.email_verification_status in ["expired", "disabled"]:
            logger.error(f"User with email {user.email} is disabled or expired.")
            return None

    @staticmethod
    def update_user(db: Session, user_id: UUID, **kwargs) -> User:
        """
        ユーザー情報を更新します。
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        for key, value in kwargs.items():
            setattr(user, key, value)
        db.commit()
        db.refresh(user)
        return user


    @staticmethod
    def update_user_email_verification(db: Session, user_id: UUID) -> User:
        """
        ユーザーのメール認証ステータスを 'verified'（OTP 成功） に更新します。
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        user.email_verification_status = "verified"
        user.email_verified_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(user)
        return user


    @staticmethod
    def delete_user(db: Session, user_id: UUID) -> None:
        """
        ユーザーを削除します。
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        db.delete(user)
        db.commit()
