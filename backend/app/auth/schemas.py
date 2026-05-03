from pydantic import BaseModel, field_validator


class RegisterIn(BaseModel):
    email: str
    password: str
    display_name: str

    @field_validator("password")
    @classmethod
    def password_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 72:
            raise ValueError("Password must be 72 characters or fewer")
        return v

    @field_validator("email")
    @classmethod
    def email_format(cls, v):
        if "@" not in v or len(v) < 3:
            raise ValueError("Invalid email address")
        return v.lower().strip()


class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    display_name: str
    has_password: bool = True


class UpdateProfileIn(BaseModel):
    display_name: str | None = None
    current_password: str | None = None
    new_password: str | None = None

    @field_validator("new_password")
    @classmethod
    def new_password_length(cls, v):
        if v is not None:
            if len(v) < 8:
                raise ValueError("Password must be at least 8 characters")
            if len(v) > 72:
                raise ValueError("Password must be 72 characters or fewer")
        return v
