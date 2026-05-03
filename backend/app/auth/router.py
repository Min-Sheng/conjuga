from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from fastapi.responses import RedirectResponse

from app.auth.schemas import LoginIn, RegisterIn, TokenOut, UpdateProfileIn, UserOut
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
    url, state = google_oauth_url()
    response = RedirectResponse(url=url)
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        samesite="lax",
        max_age=300,
    )
    return response


@router.get("/google/callback")
def google_callback(
    code: str,
    state: str,
    oauth_state: str = Cookie(default=None),
    db=Depends(get_db_dep),
):
    if not oauth_state or state != oauth_state:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OAuth state")

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
    redirect_url = f"{settings.FRONTEND_URL}/auth/callback#token={token}"
    return RedirectResponse(url=redirect_url)


@router.get("/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    return UserOut(
        id=current_user["id"],
        email=current_user["email"],
        display_name=current_user["display_name"],
        has_password=bool(current_user.get("password_hash")),
    )


@router.put("/me", response_model=UserOut)
def update_me(
    body: UpdateProfileIn,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db_dep),
):
    if body.new_password is not None:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="需要提供目前密碼")
        if not current_user.get("password_hash"):
            raise HTTPException(status_code=400, detail="Google 登入帳號無法設定密碼")
        if not verify_password(body.current_password, current_user["password_hash"]):
            raise HTTPException(status_code=400, detail="目前密碼不正確")
        db.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(body.new_password), current_user["id"]),
        )

    if body.display_name is not None:
        name = body.display_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="顯示名稱不能為空")
        db.execute(
            "UPDATE users SET display_name = ? WHERE id = ?",
            (name, current_user["id"]),
        )

    db.commit()
    row = db.execute("SELECT * FROM users WHERE id = ?", (current_user["id"],)).fetchone()
    return UserOut(id=row["id"], email=row["email"], display_name=row["display_name"], has_password=bool(row["password_hash"]))


@router.get("/config")
def get_config():
    return {"google_oauth_enabled": bool(settings.GOOGLE_CLIENT_ID)}
