"""
UserProfile model — mirrors the `user_profiles` table.
Stores user identity and role information for authenticated users.
"""
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func

from app.database import Base


class UserProfile(Base):
    """Represents a user profile record."""

    __tablename__ = "user_profiles"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False, default="")
    role = Column(String(20), nullable=False, default="operator")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<UserProfile(id={self.id!r}, email={self.email!r}, role={self.role!r})>"
