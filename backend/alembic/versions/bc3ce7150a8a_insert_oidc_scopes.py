"""insert oidc scopes

Revision ID: bc3ce7150a8a
Revises: 67a26b7e2b88
Create Date: 2026-07-19 09:47:03.623963

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bc3ce7150a8a'
down_revision: Union[str, Sequence[str], None] = '67a26b7e2b88'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 初期データの挿入（01_init.sql/02_oidc_refsh_add.sql の内容を反映）
    op.execute(
        """
        INSERT INTO oidc_scopes (id, scope_name, description)
        SELECT gen_random_uuid(), 'openid', 'OpenID Connect の必須スコープ'
        WHERE NOT EXISTS (SELECT 1 FROM oidc_scopes WHERE scope_name = 'openid');

        INSERT INTO oidc_scopes (id, scope_name, description)
        SELECT gen_random_uuid(), 'profile', 'ユーザープロファイル情報の参照'
        WHERE NOT EXISTS (SELECT 1 FROM oidc_scopes WHERE scope_name = 'profile');

        INSERT INTO oidc_scopes (id, scope_name, description)
        SELECT gen_random_uuid(), 'email', 'ユーザーのメール情報の参照'
        WHERE NOT EXISTS (SELECT 1 FROM oidc_scopes WHERE scope_name = 'email');

        INSERT INTO oidc_scopes (id, scope_name, description)
        SELECT gen_random_uuid(), 'offline_access', 'リフレッシュトークンの発行を許可（オフラインでのアクセス権限）'
        WHERE NOT EXISTS (SELECT 1 FROM oidc_scopes WHERE scope_name = 'offline_access');
        """
    )
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
