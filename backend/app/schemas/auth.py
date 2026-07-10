"""
Authentication schemas.
Covers JWT token exchange, token payload decoding, and login/register request
validation for the auth endpoints.
"""
from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    """OAuth2-compatible token response returned after successful authentication."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Decoded JWT payload used internally for dependency injection / auth checks."""

    user_id: str | None = None
    email: str | None = None
    role: str | None = None


class LoginRequest(BaseModel):
    """Credentials submitted by a user to obtain an access token."""

    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    """Payload for creating a new user account."""

    email: EmailStr
    password: str = Field(min_length=6, description="Password must be at least 6 characters")
    full_name: str = ""
