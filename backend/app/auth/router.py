from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse

from app.auth.schemas import LoginIn, RegisterIn, TokenOut, UserOut
from app.auth.service import (
    create_token,
    exchange_google_code,
    get_current_user,
    google_oauth_url,
    hash_password,
    verify_password,
)
from app.config import settings
from app.database import get_db_dep

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db=Depends(get_db_dep)):
    existing = db.execute(
        "SELECT id FROM users WHERE email = ?", (body.email,)
    ).fetchone()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    password_hash = hash_password(body.password)
    cursor = db.execute(
        "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)",
        (body.email, password_hash, body.display_name),
    )
    db.commit()
    user_id = cursor.lastrowid
    return TokenOut(access_token=create_token(user_id))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db=Depends(get_db_dep)):
    row = db.execute(
        "SELECT id, password_hash FROM users WHERE email = ?", (body.email,)
    ).fetchone()
    if row is None or not verify_password(body.password, row["password_hash"] or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenOut(access_token=create_token(row["id"]))


@router.get("/google")
def google_login():
    url = google_oauth_url()
    return RedirectResponse(url=url)


@router.get("/google/callback")
def google_callback(code: str, db=Depends(get_db_dep)):
    info = exchange_google_code(code)

    # Try to find existing user by google_id or email
    row = db.execute(
        "SELECT id FROM users WHERE google_id = ? OR email = ?",
        (info["google_id"], info["email"]),
    ).fetchone()

    if row:
        user_id = row["id"]
        # Update google_id if not set yet
        db.execute(
            "UPDATE users SET google_id = ? WHERE id = ?",
            (info["google_id"], user_id),
        )
        db.commit()
    else:
        cursor = db.execute(
            "INSERT INTO users (email, google_id, display_name) VALUES (?, ?, ?)",
            (info["email"], info["google_id"], info["display_name"]),
        )
        db.commit()
        user_id = cursor.lastrowid

    token = create_token(user_id)
    redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={token}"
    return RedirectResponse(url=redirect_url)


@router.get("/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    return UserOut(
        id=current_user["id"],
        email=current_user["email"],
        display_name=current_user["display_name"],
    )
