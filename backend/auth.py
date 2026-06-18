"""Supabase JWT validation and user profile helpers."""

from __future__ import annotations

import os
from typing import Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

_bearer = HTTPBearer(auto_error=False)
_jwks_client: PyJWKClient | None = None


def _jwt_secret() -> str | None:
    raw = os.getenv("SUPABASE_JWT_SECRET") or os.getenv("JWT_SECRET")
    return raw.strip() if raw else None


def _supabase_url() -> str | None:
    raw = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    if not raw:
        return None
    return raw.rstrip("/")


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    base = _supabase_url()
    if not base:
        return None
    if _jwks_client is None:
        _jwks_client = PyJWKClient(f"{base}/auth/v1/.well-known/jwks.json", cache_keys=True)
    return _jwks_client


def auth_configured() -> bool:
    return bool(_jwt_secret()) or bool(_supabase_url())


def decode_supabase_token(token: str) -> dict[str, Any]:
    if not auth_configured():
        raise HTTPException(
            status_code=503,
            detail="Auth not configured. Set SUPABASE_JWT_SECRET and/or SUPABASE_URL on the backend.",
        )

    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token.") from exc

    alg = header.get("alg", "HS256")

    try:
        if alg == "ES256":
            client = _get_jwks_client()
            if client is None:
                raise HTTPException(
                    status_code=503,
                    detail="ES256 tokens require SUPABASE_URL (same as VITE_SUPABASE_URL) on the backend.",
                )
            signing_key = client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
            )

        secret = _jwt_secret()
        if not secret:
            raise HTTPException(
                status_code=503,
                detail="HS256 tokens require SUPABASE_JWT_SECRET on the backend.",
            )
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except HTTPException:
        raise
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
