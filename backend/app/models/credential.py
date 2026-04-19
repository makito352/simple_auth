import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.session import Base


class Credential(Base):
    __tablename__ = "credentials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    credential_id = Column(String, unique=True, nullable=False)
    public_key = Column(String, nullable=False)
    sign_count = Column(Integer, default=0)
    device_name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
