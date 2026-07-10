"""
Authentication service.

Encapsulates user registration, login, token verification, and profile
management. Passwords are hashed with bcrypt via the security module, and
JWT access tokens are issued/decoded using the same module. The service
layer sits between the API routes and the UserRepository, translating
transport-level concerns (tokens, hashes) into domain operations.
"""
import uuid
from typing import Optional

from sqlalchemy.orm import Session
from jose import JWTError

from app.repositories.user_repository import UserRepository
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
)
from app.core.exceptions import (
    NotFoundException,
    UnauthorizedException,
    ConflictException,
    ValidationException,
)
from app.models.user import UserProfile


class AuthService:
    """
    Service handling authentication and user-profile operations.

    All methods operate against a single SQLAlchemy session provided at
    construction time, making the service safe to instantiate per-request.
    """

    def __init__(self, db: Session):
        """Initialize the service with a database session and user repository."""
        self.db = db
        self.user_repo = UserRepository(db)

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------
    def register(
        self,
        email: str,
        password: str,
        full_name: str = "",
    ) -> dict:
        """
        Register a new user.

        Creates a user_profiles record with a bcrypt-hashed password stored
        alongside the profile, then issues a JWT access token for immediate
        authentication.

        Args:
            email: The user's unique email address.
            password: The plaintext password (hashed before storage).
            full_name: Optional display name for the user.

        Returns:
            A dict containing:
                - access_token: The JWT token string.
                - token_type: Always "bearer".
                - user: {"id", "email", "role"} of the newly created user.

        Raises:
            ValidationException: If email or password are empty/invalid.
            ConflictException: If a user with the email already exists.
        """
        # --- Input validation ---
        if not email or not email.strip():
            raise ValidationException(detail="Email is required")
        if not password or len(password) < 6:
            raise ValidationException(detail="Password must be at least 6 characters")

        email = email.strip().lower()

        # --- Uniqueness check ---
        existing = self.user_repo.get_by_email(email)
        if existing:
            raise ConflictException(detail="A user with this email already exists")

        # --- Create the user profile ---
        user_id = str(uuid.uuid4())
        password_hash = get_password_hash(password)

        user = self.user_repo.create_user(
            email=email,
            full_name=full_name.strip() if full_name else "",
            role="operator",
            id=user_id,
        )

        # Store the password hash on the profile row. The UserProfile model
        # stores credentials alongside identity so the service can verify
        # logins without a separate credentials table.
        user.password_hash = password_hash
        self.db.commit()
        self.db.refresh(user)

        # --- Issue JWT ---
        token_data = {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
        }
        access_token = create_access_token(token_data)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
            },
        }

    def login(self, email: str, password: str) -> dict:
        """
        Authenticate a user and return a JWT token.

        Args:
            email: The user's email address.
            password: The plaintext password to verify.

        Returns:
            A dict containing:
                - access_token: The JWT token string.
                - token_type: Always "bearer".
                - user: {"id", "email", "role"} of the authenticated user.

        Raises:
            ValidationException: If email or password are empty.
            UnauthorizedException: If credentials are invalid.
        """
        # --- Input validation ---
        if not email or not email.strip():
            raise ValidationException(detail="Email is required")
        if not password:
            raise ValidationException(detail="Password is required")

        email = email.strip().lower()

        # --- Lookup & verify ---
        user = self.user_repo.get_by_email(email)
        if not user:
            raise UnauthorizedException(detail="Invalid email or password")

        stored_hash = getattr(user, "password_hash", None)
        if not stored_hash or not verify_password(password, stored_hash):
            raise UnauthorizedException(detail="Invalid email or password")

        # --- Issue JWT ---
        token_data = {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
        }
        access_token = create_access_token(token_data)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
            },
        }

    def get_current_user(self, token: str) -> dict:
        """
        Decode a JWT token and return the embedded user info.

        Args:
            token: The encoded JWT access token.

        Returns:
            A dict containing {"id", "email", "role"} of the token subject.

        Raises:
            UnauthorizedException: If the token is invalid, expired, or
                references a user that no longer exists.
        """
        try:
            payload = decode_access_token(token)
        except JWTError as exc:
            raise UnauthorizedException(detail="Could not validate credentials") from exc

        user_id: Optional[str] = payload.get("sub")
        email: Optional[str] = payload.get("email")
        role: Optional[str] = payload.get("role")

        if user_id is None or email is None or role is None:
            raise UnauthorizedException(detail="Could not validate credentials")

        # Confirm the user still exists in the database
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise UnauthorizedException(detail="User not found")

        return {
            "id": user.id,
            "email": user.email,
            "role": user.role,
        }

    # ------------------------------------------------------------------
    # Profile management
    # ------------------------------------------------------------------
    def update_profile(
        self,
        user_id: str,
        full_name: Optional[str] = None,
        role: Optional[str] = None,
    ) -> UserProfile:
        """
        Update the authenticated user's profile fields.

        Only the provided (non-None) fields are updated.

        Args:
            user_id: The ID of the user whose profile is being updated.
            full_name: Optional new display name.
            role: Optional new role (e.g. "operator", "admin").

        Returns:
            The refreshed UserProfile object.

        Raises:
            NotFoundException: If no user exists with the given ID.
        """
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(detail="User not found")

        update_data: dict = {}
        if full_name is not None:
            update_data["full_name"] = full_name
        if role is not None:
            update_data["role"] = role

        if update_data:
            updated = self.user_repo.update(user_id, update_data)
            if not updated:
                raise NotFoundException(detail="User not found")
            return updated

        return user

    def get_profile(self, user_id: str) -> UserProfile:
        """
        Retrieve a user's profile by ID.

        Args:
            user_id: The ID of the user to fetch.

        Returns:
            The UserProfile object.

        Raises:
            NotFoundException: If no user exists with the given ID.
        """
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(detail="User not found")
        return user
