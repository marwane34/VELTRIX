"""
Machine repository.

Encapsulates all machine-scoped queries, including ownership filtering by
`user_id`, lightweight search, and per-user counts. All list methods are
user-scoped so callers never accidentally leak another tenant's machines.
"""
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.machine import Machine
from app.repositories.base import BaseRepository


class MachineRepository(BaseRepository[Machine]):
    """Repository for the `machines` table."""

    def __init__(self, db: Session):
        super().__init__(Machine, db)

    def get_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Machine]:
        """Return all machines belonging to a user, paginated."""
        return (
            self.db.query(Machine)
            .filter(Machine.user_id == user_id)
            .order_by(Machine.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def search(
        self,
        user_id: str,
        query: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Machine], int]:
        """
        Search a user's machines by free-text query (matched against name or
        location) and optional status filter.

        Returns a (rows, total) tuple so the API layer can return pagination
        metadata without re-running the query.
        """
        stmt = self.db.query(Machine).filter(Machine.user_id == user_id)

        if query:
            pattern = f"%{query}%"
            stmt = stmt.filter(
                or_(
                    Machine.name.ilike(pattern),
                    Machine.location.ilike(pattern),
                )
            )

        if status:
            stmt = stmt.filter(Machine.status == status)

        total = stmt.count()

        rows = (
            stmt.order_by(Machine.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return rows, total

    def count_by_user(self, user_id: str) -> int:
        """Count how many machines a user owns."""
        return (
            self.db.query(Machine)
            .filter(Machine.user_id == user_id)
            .count()
        )

    def get_by_id_and_user(
        self,
        id: str,
        user_id: str,
    ) -> Optional[Machine]:
        """
        Fetch a single machine only if it belongs to the given user.
        Used to enforce ownership before returning / mutating a machine.
        """
        return (
            self.db.query(Machine)
            .filter(Machine.id == id, Machine.user_id == user_id)
            .first()
        )
