"""
Generic base repository providing common CRUD operations.

All entity-specific repositories inherit from BaseRepository and extend it
with domain-specific query methods. The base class is generic over the
SQLAlchemy model type so that subclasses get proper type hints for free.
"""
from typing import TypeVar, Generic, Type, Optional, Any

from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic repository that wraps a SQLAlchemy session and a model class,
    exposing reusable CRUD and counting helpers.

    Subclasses typically pass their model class to super().__init__:
        class UserRepository(BaseRepository[UserProfile]):
            def __init__(self, db: Session):
                super().__init__(UserProfile, db)
    """

    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------
    def get_by_id(self, id: str) -> Optional[ModelType]:
        """Fetch a single record by its primary key `id`."""
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> list[ModelType]:
        """Return a page of all records, ordered by insertion (offset/limit)."""
        return self.db.query(self.model).offset(skip).limit(limit).all()

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------
    def create(self, obj_data: dict) -> ModelType:
        """Insert a new record from a field dict, commit, and return it refreshed."""
        obj = self.model(**obj_data)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, id: str, obj_data: dict) -> Optional[ModelType]:
        """
        Update an existing record identified by `id` with the non-None values
        in `obj_data`. Returns the refreshed object or None if not found.
        """
        obj = self.get_by_id(id)
        if not obj:
            return None
        for key, value in obj_data.items():
            if value is not None:
                setattr(obj, key, value)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, id: str) -> bool:
        """Delete a record by `id`. Returns True if a row was deleted, else False."""
        obj = self.get_by_id(id)
        if not obj:
            return False
        self.db.delete(obj)
        self.db.commit()
        return True

    # ------------------------------------------------------------------
    # Aggregation
    # ------------------------------------------------------------------
    def count(self, filters: dict | None = None) -> int:
        """
        Count rows, optionally filtered by an equality-based filter dict.
        Only keys that exist as columns on the model and whose value is not
        None are applied.
        """
        query = self.db.query(self.model)
        if filters:
            for key, value in filters.items():
                if value is not None and hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
        return query.count()
