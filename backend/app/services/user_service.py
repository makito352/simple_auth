"""
UserService: ユーザーの作成・取得・更新・削除を行うサービスクラス
"""

from datetime import datetime, timedelta, timezone

from app.core.config import logger, settings
from app.models.user import User, UserRole, UserStatus
from app.services.one_time_link_service import OneTimeLinkService
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Session


class UserService:

    @staticmethod
    def create_user(db: Session, email: str, role: str = UserRole.USER.value) -> User:
        """
        新しいユーザーを作成します。
        """
        actual_role = role
        if hasattr(role, "value"):
            actual_role = role.value

        existing_user = db.query(User).filter(User.email == email).first()

        if existing_user:
            if existing_user.email_verification_status in [
                UserStatus.PENDING.value,
                UserStatus.VERIFIED.value,
            ]:
                # 既に存在する場合はエラーを返す
                logger.error(
                    "User with email %s is already pending or verified.", email
                )
                raise ValueError(
                    "メールアドレスが既に登録されています。(Email already exists.)"
                )

            elif existing_user.email_verification_status in [
                UserStatus.EXPIRED.value,
                UserStatus.DISABLED.value,
            ]:
                # 既存ユーザーのステータスが expired または disabled の場合、再度 pending に更新する
                existing_user.email_verification_status = UserStatus.PENDING.value
                existing_user.email_verified_at = None
                existing_user.email_verification_expires_at = datetime.now(
                    timezone.utc
                ) + timedelta(days=1)
                db.commit()
                db.refresh(existing_user)
                return existing_user

        new_user = User(
            email=email,
            role=actual_role,
            email_verification_status=UserStatus.PENDING.value,
            email_verified_at=None,
            email_verification_expires_at=datetime.now(timezone.utc)
            + timedelta(days=1),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def is_initial_setup_required(db: Session) -> User:
        """
        システムがまだ初期セットアップ（初期管理者の登録）を完了していないか判定します。
        
        初期設定が未完了の場合は True を返す。
        """
        # 初期管理者のメールアドレスとパスワードが設定されていない場合は、初期管理者ログインをスキップ
        admin_email = settings.INITIAL_ADMIN_USER_EMAIL
        admin_password = settings.INITIAL_ADMIN_USER_PASSWORD
        if not admin_email or not admin_password:
            logger.debug("Initial admin credentials not set. Skipping.")
            raise ValueError("初期管理者設定が完了していません。")

        # 全ユーザー数をカウント
        user_count = db.query(User).count()
        if user_count != 1:
            logger.warning("Initial admin login failed: count is %d", user_count)
            raise ValueError(
                "初期管理画面チェック失敗しました。システムの状態が正しくありません。"
            )
        
        # 管理者（Admin）が存在するか確認
        user = db.query(User).filter(User.role == UserRole.ADMIN.value).first()
        
        # 管理者が存在しない場合も、セットアップを促す必要がある（または状況により判断）
        if not user or user.email_verification_status != UserStatus.PENDING.value:
            logger.warning("Initial admin login failed: status invalid.")
            raise ValueError("認証に失敗しました。")

        return user
    
    @staticmethod
    def initial_admin_login(db: Session, email: str, password: str) -> User:
        """
        初期管理者（Initial Admin）の認証を検証します。
        成功した場合はUserオブジェクトを返し、失敗した場合は適切な例外を投げます。
        """
        # 初期管理者のメールアドレスとパスワードが設定されていない場合は、初期管理者ログインをスキップ
        admin_email = settings.INITIAL_ADMIN_USER_EMAIL
        admin_password = settings.INITIAL_ADMIN_USER_PASSWORD
        if not admin_email or not admin_password:
            logger.debug("Initial admin credentials not set. Skipping.")
            raise ValueError("初期管理者設定が完了していません。")

        # 1. システム全体のユーザー数をチェック
        user_count = db.query(User).count()
        if user_count != 1:
            logger.warning("Initial admin login failed: count is %d", user_count)
            raise ValueError(
                "初期管理者ログインに失敗しました。システムの状態が正しくありません。"
            )

        # 2 & 3. 設定値と入力値の照合
        if (
            email != settings.INITIAL_ADMIN_USER_EMAIL
            or password != settings.INITIAL_ADMIN_USER_PASSWORD
        ):
            logger.warning("Initial admin login failed: credential mismatch.")
            raise ValueError("認証情報が正しくありません。")

        # 4. 対象ユーザーの存在とステータスの確認
        user = db.query(User).filter(User.email == email).first()
        if not user or user.email_verification_status != UserStatus.PENDING.value:
            logger.warning("Initial admin login failed: status invalid.")
            raise ValueError("認証に失敗しました。")
        # 5. ユーザーのロールが ADMIN であることを確認
        if user.role != UserRole.ADMIN.value:
            logger.warning("Initial admin login failed: role is not admin.")
            raise ValueError("権限がありません。")

        return user

    @staticmethod
    def _ensure_initial_admin(db: Session) -> User:
        """
        ユーザーが0件の場合、初期管理者のメールアドレスを使用して
        管理者権限を持つユーザーを自動作成します。
        """
        count = db.query(User).count()
        admin_email = settings.INITIAL_ADMIN_USER_EMAIL
        admin_password = settings.INITIAL_ADMIN_USER_PASSWORD
        if not admin_email or not admin_password:
            logger.debug(
                "INITIAL_ADMIN_USER_EMAIL or INITIAL_ADMIN_USER_PASSWORD is not set. Skipping initial admin user creation."
            )
            return None
        if count == 0:
            user = UserService.create_user(db, email=admin_email, role=UserRole.ADMIN)
            logger.info("Initial admin user created with email: %s", user.email)
            return user
        return db.query(User).filter(User.email == admin_email).first()

    @staticmethod
    def initialize_system(db: Session) -> None:
        """
        初期セットアップ用のエントリーポイント。
        管理者の作成と、必要な場合の認証用URLの表示を行います。
        """
        if not settings.INITIAL_ADMIN_USER_EMAIL:
            logger.debug(
                "INITIAL_ADMIN_USER_EMAIL is not set. Skipping initial admin user creation."
            )
            return

        # 管理者権限を持つユーザーを自動作成
        # ※生成済みの場合は管理者Userを返す
        user = UserService._ensure_initial_admin(db)

        if not user:
            logger.warning("Initial admin user not found.")
            return

        # ステータスが pending の場合はリンクを表示する
        # if user.email_verification_status == UserStatus.PENDING.value:
        #     link = OneTimeLinkService.get_link_by_user_id(db, user.id)
        #     if link is None:
        #         logger.warning(
        #             "Warning: No active OneTimeLink found for user %s (ID: %s)",
        #             user.email,
        #             user.id,
        #         )
        #     else:
        #         logger.info("Admin user setup complete. Status: pending.")
        #         logger.info(
        #             "Please use the following link to verify the admin account: %s",
        #             link.url,
        #         )
        # else:
        if user.email_verification_status != UserStatus.PENDING.value:
            logger.debug(
                "Admin user setup complete. Status: %s", user.email_verification_status
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

        if user.email_verification_status == UserStatus.VERIFIED.value:
            return user
        elif user.email_verification_status == UserStatus.PENDING.value:
            if user.email_verification_expires_at > datetime.now(timezone.utc):
                return user
            else:
                logger.error("User with email %s has expired verification.", user.email)
                raise ValueError("Email verification has expired.")
        elif user.email_verification_status in [
            UserStatus.EXPIRED.value,
            UserStatus.DISABLED.value,
        ]:
            logger.error("User with email %s is disabled or expired.", user.email)
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

        if user.email_verification_status == UserStatus.VERIFIED.value:
            return user
        elif user.email_verification_status == UserStatus.PENDING.value:
            if user.email_verification_expires_at > datetime.now(timezone.utc):
                return user
            else:
                logger.error("User with email %s has expired verification.", user.email)
                return None
        elif user.email_verification_status in [
            UserStatus.EXPIRED.value,
            UserStatus.DISABLED.value,
        ]:
            logger.error("User with email %s is disabled or expired.", user.email)
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

        user.email_verification_status = UserStatus.VERIFIED.value
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
