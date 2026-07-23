"""FastAPI auth dependencies.

The frontend attaches the login JWT as ``Authorization: Bearer <token>`` on every
proxied backend call. These dependencies decode that token so routes can attribute
created/modified records to the real authenticated user instead of a hardcoded id.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.security import decode_access_token

# auto_error=False → we raise our own 401 (and keep a single, consistent message).
_bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict:
    """Decode the Bearer JWT and return its claims, or raise 401."""
    if credentials is None or not credentials.credentials:
        raise _UNAUTHENTICATED
    payload = decode_access_token(credentials.credentials)
    if not payload or payload.get("sub") is None:
        raise _UNAUTHENTICATED
    return payload


def get_current_user_id(payload: dict = Depends(get_current_user)) -> int:
    """Return the authenticated user's integer id (the JWT ``sub`` claim)."""
    try:
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise _UNAUTHENTICATED
