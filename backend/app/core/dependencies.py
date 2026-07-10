"""
FastAPI dependency injection for authentication and authorization.
Provides reusable dependencies for extracting the current user from a JWT
and enforcing role-based access control.
"""
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_access_token

# OAuth2 password bearer scheme — token is obtained from /api/auth/login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Decode the JWT bearer token and return the authenticated user's info.

    Args:
        token: The JWT access token extracted from the Authorization header.

    Returns:
        A dict containing {"user_id": ..., "email": ..., "role": ...}.

    Raises:
        UnauthorizedException: If the token is missing, invalid, or malformed.
    """
    try:
        payload = decode_access_token(token)
    except JWTError as exc:
        raise UnauthorizedException(detail="Could not validate credentials") from exc

    user_id: str | None = payload.get("sub")
    email: str | None = payload.get("email")
    role: str | None = payload.get("role")

    if user_id is None or email is None or role is None:
        raise UnauthorizedException(detail="Could not validate credentials")

    return {
        "user_id": user_id,
        "email": email,
        "role": role,
    }


def get_current_user_id(current_user: dict = Depends(get_current_user)) -> str:
    """
    Return only the authenticated user's ID.

    Args:
        current_user: The user dict provided by get_current_user.

    Returns:
        The user_id string.
    """
    return current_user["user_id"]


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Ensure the authenticated user has the 'admin' role.

    Args:
        current_user: The user dict provided by get_current_user.

    Returns:
        The user dict if the user is an admin.

    Raises:
        ForbiddenException: If the user's role is not 'admin'.
    """
    if current_user.get("role") != "admin":
        raise ForbiddenException(detail="Admin privileges required")
    return current_user
