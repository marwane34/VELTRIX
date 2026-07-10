"""
Common shared schemas.
Provides reusable pagination parameters and a generic paginated response
wrapper used across all resource endpoints.
"""
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Standard pagination, filtering, and sorting parameters for list endpoints."""

    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(
        default=20, ge=1, le=100, description="Number of items per page (1-100)"
    )
    search: str | None = Field(
        default=None, description="Optional search term to filter results"
    )
    sort_by: str | None = Field(
        default=None, description="Column name to sort results by"
    )
    sort_order: str = Field(default="asc", description="Sort direction: 'asc' or 'desc'")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic paginated response wrapper.

    Carries the slice of items for the current page along with metadata
    describing the total count and how many pages are available.
    """

    items: list[T]
    total: int = Field(ge=0, description="Total number of items across all pages")
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, description="Number of items per page")
    pages: int = Field(ge=0, description="Total number of pages")
