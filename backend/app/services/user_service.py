from datetime import datetime, timedelta, timezone

from app.core.config import logger, settings
from app.models.user import User
from app.services.one_time_link_service import OneTimeLinkService
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Session


class UserService:

    @staticmethod
    def create_user(db: Session, email: str, role: str = "user") -> User:
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
                existing_user.email_verification_expires_at = datetime.now(
                    timezone.utc
                ) + timedelta(days=1)
                db.commit()
                db.refresh(existing_user)
                return existing_user

        new_user = User(
            email=email,
            role=role,
            email_verification_status="pending",
            email_verified_at=None,
            email_verification_expires_at=datetime.now(timezone.utc)
            + timedelta(days=1),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def _ensure_initial_admin(db: Session) -> User:
        """
        ユーザーが0件の場合、初期管理者のメールアドレスを使用して
        管理者権限を持つユーザーを自動作成します。
        """
        count = db.query(User).count()
        admin_email = settings.INITIAL_ADMIN_USER_EMAIL
        if count == 0:
            user = UserService.create_user(db, email=admin_email, role="admin")
            link = OneTimeLinkService.create_link(db, user.id)
            logger.info(
                f"Created initial admin user with email: {admin_email}, onetime link:{link.url}"
            )
            return user
        return db.query(User).filter(User.email == admin_email).first()

    @staticmethod
    def initialize_system(db: Session) -> None:
        """
        初期セットアップ用のエントリーポイント。
        管理者の作成と、必要な場合の認証用URLの表示を行います。
        """

        # 管理者権限を持つユーザーを自動作成
        # ※生成済みの場合は管理者Userを返す
        user = UserService._ensure_initial_admin(db)

        if not user:
            logger.warning("Initial admin user not found.")
            return

        # ステータスが pending の場合はリンクを表示する
        # user = UserService.read_user_by_email(db, settings.INITIAL_ADMIN_USER_EMAIL)
        if user.email_verification_status == "pending":
            link = OneTimeLinkService.get_link_by_user_id(db, user.id)
            if link is None:
                logger.warning(
                    f"Warning: No active OneTimeLink found for user {user.email} (ID: {user.id})"
                )
            else:
                logger.info(f"Admin user setup complete. Status: pending.")
                logger.info(
                    f"Please use the following link to verify the admin account: {link.url}"
                )
        else:
            logger.debug(
                f"Admin user setup complete. Status: {user.email_verification_status}"
            )

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
    def get_all_users(db: Session) -> list[User]:
        """
        全ユーザーのリストを取得します。
        """
        return db.query(User).all()

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
