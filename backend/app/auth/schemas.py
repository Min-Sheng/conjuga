from pydantic import BaseModel
from typing import Optional


class RegisterIn(BaseModel):
    email: str
    password: str
    display_name: str


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
