import uuid

from sqlalchemy import TIMESTAMP, Column, ForeignKey
from sqlalchemy.dialects.postgresql import BYTEA, UUID
from sqlalchemy.sql import func

from app.db.session import Base


class AuthenticationOption(Base):
    __tablename__ = "authentication_options"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    challenge = Column(BYTEA, nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self):
        return f"<AuthenticationOption(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"
