"""fix_challenge_type

Revision ID: b429a36337ab
Revises: b160328a4196
Create Date: 2026-07-19 01:30:03.124540

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b429a36337ab'
down_revision: Union[str, Sequence[str], None] = 'b160328a4196'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
