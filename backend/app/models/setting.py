"""
Setting model — mirrors the `settings` table.
Stores per-user application settings as key/value pairs grouped by category,
enforced unique per (user_id, key) via a composite unique constraint.
"""
from sqlalchemy import Column, String, Text, DateTime, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class Setting(Base):
    """Represents a single user-scoped application setting."""

    __tablename__ = "settings"
    __table_args__ = (
        UniqueConstraint("user_id", "key", name="uq_settings_user_id_key"),
    )

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(Text, nullable=False, default="")
    category = Column(String(100), nullable=False, default="general")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return (
            f"<Setting(id={self.id!r}, user_id={self.user_id!r}, "
            f"key={self.key!r}, category={self.category!r})>"
        )
