"""
Security module.
Handles password hashing with passlib/bcrypt and JWT token management with python-jose.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration pulled from app settings
SECRET_KEY: str = settings.SECRET_KEY
ALGORITHM: str = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES: int = settings.ACCESS_TOKEN_EXPIRE_MINUTES


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a hashed password."""
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash for the given plaintext password."""
    return pwd_context.hash(password)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: The payload to encode (typically {"sub": user_id, "email": ..., "role": ...}).
        expires_delta: Optional custom expiration duration. Defaults to ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        Encoded JWT string.
    """
    to_encode: dict[str, Any] = data.copy()

    if expires_delta is not None:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt: str = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT access token.

    Args:
        token: The encoded JWT string.

    Returns:
        The decoded payload as a dict.

    Raises:
        JWTError: If the token is invalid, expired, or cannot be decoded.
    """
    try:
        payload: dict[str, Any] = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise JWTError(f"Could not validate credentials: {exc}") from exc
    return payload
