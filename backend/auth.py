"""Supabase JWT validation and user profile helpers."""

from __future__ import annotations

import os
from typing import Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer(auto_error=False)


def _jwt_secret() -> str | None:
    return os.getenv("SUPABASE_JWT_SECRET") or os.getenv("JWT_SECRET")


def auth_configured() -> bool:
    return bool(_jwt_secret())


def decode_supabase_token(token: str) -> dict[str, Any]:
    secret = _jwt_secret()
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="Auth not configured. Set SUPABASE_JWT_SECRET on the backend.",
        )
    try:
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token.") from exc


def get_token_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authorization Bearer token required.")
    return decode_supabase_token(credentials.credentials)


def get_auth_user_id(payload: dict[str, Any] = Depends(get_token_payload)) -> str:
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing subject.")
    return str(sub)


def get_token_email(payload: dict[str, Any] = Depends(get_token_payload)) -> str:
    email = payload.get("email")
    if not email:
        meta = payload.get("user_metadata") or {}
        email = meta.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Token missing email.")
    return str(email).lower()
