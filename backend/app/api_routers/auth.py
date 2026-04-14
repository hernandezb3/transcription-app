from fastapi import APIRouter, HTTPException, status

from app.data_models.user import UserCreate, UserLogin, TokenResponse
from app.repositories.user.controller import UserRepository
from app.auth.security import verify_password, create_access_token

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    """Create a new account with a username and password."""
    if not user.user_name or not user.password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="user_name and password are required.",
        )

    repo = UserRepository()

    # Check if username already exists
    existing = await repo.aget_user_by_username(user.user_name)
    rows = existing.get("data", [])
    if rows:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that username already exists.",
        )

    result = await repo.create_user(user)
    new_id = result.get("data")

    # Fetch the newly created user so we can return token data
    user_result = await repo.aget_user_by_username(user.user_name)
    user_rows = user_result.get("data", [])
    if not user_rows:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User created but could not be retrieved.",
        )

    created_user = user_rows[0]
    token = create_access_token(
        {"sub": str(created_user["id"]), "user_name": created_user["user_name"]}
    )

    return TokenResponse(
        access_token=token,
        user_id=created_user["id"],
        user_name=created_user["user_name"],
        display_name=created_user.get("display_name"),
        user_email=created_user.get("user_email"),
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Authenticate with username + password and receive a JWT."""
    repo = UserRepository()
    result = await repo.aget_user_by_username(credentials.user_name)
    rows = result.get("data", [])

    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not rows:
        raise error

    user = rows[0]

    if not user.get("password_hash"):
        raise error

    if user.get("active") != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive.",
        )

    if not verify_password(credentials.password, user["password_hash"]):
        raise error

    token = create_access_token(
        {"sub": str(user["id"]), "user_name": user["user_name"]}
    )

    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        user_name=user["user_name"],
        display_name=user.get("display_name"),
        user_email=user.get("user_email"),
    )
