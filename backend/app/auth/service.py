import secrets
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta, timezone

import bcrypt
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings
from app.database import get_db_dep

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

ALGORITHM = "HS256"


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exception
        return int(sub)
    except (JWTError, ValueError):
        raise credentials_exception


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db_dep),
) -> dict:
    user_id = decode_token(token)
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return dict(row)


# ---------------------------------------------------------------------------
# Google OAuth helpers
# ---------------------------------------------------------------------------

def google_oauth_url() -> tuple[str, str]:
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured",
        )
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "state": state,
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"https://accounts.google.com/o/oauth2/v2/auth?{query}", state


def exchange_google_code(code: str) -> dict:
    """Exchange an authorization code for Google user info.

    Returns a dict with keys: google_id, email, display_name.
    """
    print(f"[exchange_google_code] Exchanging code: {code[:20]}...")
    print(f"[exchange_google_code] Redirect URI: {settings.BACKEND_URL}/auth/google/callback")
    token_resp = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": f"{settings.BACKEND_URL}/auth/google/callback",
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    print(f"[exchange_google_code] Token response status: {token_resp.status_code}")
    print(f"[exchange_google_code] Token response body: {token_resp.text}")
    try:
        token_resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        print(f"[exchange_google_code] Token exchange failed: {e}")
        raise HTTPException(status_code=502, detail="OAuth token exchange failed")
    try:
        access_token = token_resp.json()["access_token"]
        print(f"[exchange_google_code] Got access token: {access_token[:20]}...")
    except KeyError as e:
        print(f"[exchange_google_code] No access_token in response: {e}")
        raise HTTPException(status_code=502, detail="OAuth token exchange failed")

    userinfo_resp = httpx.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    try:
        userinfo_resp.raise_for_status()
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="Failed to fetch Google user info")
    info = userinfo_resp.json()

    return {
        "google_id": info["sub"],
        "email": info["email"],
        "display_name": info.get("name") or info.get("email", "").split("@")[0],
    }

# ---------------------------------------------------------------------------
# Email helpers
# ---------------------------------------------------------------------------

def send_reset_email(to_email: str, reset_link: str):
    """Sends a password reset email using SMTP."""
    # Always print to console for development/debugging
    print(f"\n========== PASSWORD RESET ==========")
    print(f"To: {to_email}")
    print(f"Link: {reset_link}")
    print(f"====================================\n")

    # Only attempt to send if SMTP_USERNAME is configured
    if not settings.SMTP_USERNAME:
        print("[Email] SMTP_USERNAME not configured. Skipping actual email dispatch.")
        return

    msg = MIMEText(f"請點擊以下連結重設您的密碼：\n\n{reset_link}\n\n如果您沒有發起此請求，請忽略這封信件。\n這份連結將在 1 小時後失效。")
    msg["Subject"] = "Conjuga: 密碼重設請求"
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email

    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        print(f"[Email] Password reset email successfully sent to {to_email}")
    except Exception as e:
        print(f"[Email] Failed to send email to {to_email}: {e}")

