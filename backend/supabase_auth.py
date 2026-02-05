import asyncio
import json
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Sequence, Tuple

import httpx
import jwt
from fastapi import HTTPException, Request


def _parse_bool(value: Optional[str]) -> Optional[bool]:
    if value is None:
        return None
    lowered = value.strip().lower()
    if lowered in {"1", "true", "yes", "y", "on"}:
        return True
    if lowered in {"0", "false", "no", "n", "off"}:
        return False
    return None


def _get_supabase_base_url() -> str:
    return (os.getenv("SUPABASE_PROJECT_URL") or os.getenv("SUPABASE_URL") or "").rstrip("/")


def _get_supabase_anon_key() -> str:
    return os.getenv("SUPABASE_ANON_KEY", "")


def _get_supabase_jwt_secret() -> str:
    return os.getenv("SUPABASE_JWT_SECRET", "")


def _get_expected_audiences() -> Sequence[str]:
    raw = os.getenv("SUPABASE_JWT_AUD", "authenticated")
    items = [x.strip() for x in raw.split(",") if x.strip()]
    return items or ["authenticated"]


def _get_expected_issuer() -> str:
    return os.getenv("SUPABASE_JWT_ISSUER", "")


def is_supabase_auth_required_for_ai() -> bool:
    override = _parse_bool(os.getenv("REQUIRE_SUPABASE_AUTH_FOR_AI"))
    if override is not None:
        return override

    # Safe fallback: do not require auth unless the backend is configured to verify it.
    if _get_supabase_jwt_secret():
        return True
    if _get_supabase_base_url() and _get_supabase_anon_key():
        return True
    if _get_supabase_base_url():
        return True
    return False


@dataclass(frozen=True)
class VerifiedSupabaseToken:
    user_id: str
    claims: Dict[str, Any]


_JWKS_CACHE: Dict[str, Any] = {"value": None, "fetched_at": 0.0}
_JWKS_LOCK = asyncio.Lock()
_JWKS_TTL_SECONDS = 600


async def _fetch_jwks(base_url: str) -> Optional[Dict[str, Any]]:
    jwks_url = os.getenv("SUPABASE_JWKS_URL", "").strip()
    url = jwks_url or f"{base_url}/auth/v1/certs"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url)
        if res.status_code != 200:
            return None
        data = res.json()
        if isinstance(data, dict) and isinstance(data.get("keys"), list):
            return data
    except Exception:
        return None
    return None


async def _get_cached_jwks(base_url: str) -> Optional[Dict[str, Any]]:
    now = time.time()
    cached = _JWKS_CACHE.get("value")
    fetched_at = float(_JWKS_CACHE.get("fetched_at") or 0.0)
    if cached and (now - fetched_at) < _JWKS_TTL_SECONDS:
        return cached

    async with _JWKS_LOCK:
        now = time.time()
        cached = _JWKS_CACHE.get("value")
        fetched_at = float(_JWKS_CACHE.get("fetched_at") or 0.0)
        if cached and (now - fetched_at) < _JWKS_TTL_SECONDS:
            return cached

        jwks = await _fetch_jwks(base_url)
        if jwks:
            _JWKS_CACHE["value"] = jwks
            _JWKS_CACHE["fetched_at"] = now
        return jwks


def _extract_user_id(claims: Dict[str, Any]) -> str:
    sub = claims.get("sub")
    if isinstance(sub, str) and sub.strip():
        return sub.strip()
    user_id = claims.get("user_id")
    if isinstance(user_id, str) and user_id.strip():
        return user_id.strip()
    return ""


def _decode_with_secret(token: str, secret: str) -> Dict[str, Any]:
    header = jwt.get_unverified_header(token)
    alg = header.get("alg") or "HS256"
    audiences = list(_get_expected_audiences())
    issuer = _get_expected_issuer()

    options = {"verify_aud": bool(audiences), "verify_iss": bool(issuer)}
    return jwt.decode(
        token,
        secret,
        algorithms=[alg],
        audience=audiences if audiences else None,
        issuer=issuer or None,
        options=options,
    )


async def _decode_with_jwks(token: str, base_url: str) -> Dict[str, Any]:
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    alg = header.get("alg") or "RS256"
    if not kid:
        raise ValueError("JWT is missing kid header")

    jwks = await _get_cached_jwks(base_url)
    if not jwks:
        raise ValueError("JWKS unavailable")

    keys = jwks.get("keys") or []
    key_obj = next((k for k in keys if isinstance(k, dict) and k.get("kid") == kid), None)
    if not key_obj:
        raise ValueError("JWKS kid not found")

    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_obj))
    audiences = list(_get_expected_audiences())
    issuer = _get_expected_issuer()
    options = {"verify_aud": bool(audiences), "verify_iss": bool(issuer)}

    return jwt.decode(
        token,
        public_key,
        algorithms=[alg],
        audience=audiences if audiences else None,
        issuer=issuer or None,
        options=options,
    )


async def _verify_via_supabase_user_endpoint(token: str, base_url: str, anon_key: str) -> Tuple[str, Dict[str, Any]]:
    url = f"{base_url}/auth/v1/user"
    async with httpx.AsyncClient(timeout=5.0) as client:
        res = await client.get(url, headers={"Authorization": f"Bearer {token}", "apikey": anon_key})
    if res.status_code != 200:
        raise ValueError("Supabase user endpoint rejected token")
    data = res.json()
    user_id = data.get("id") if isinstance(data, dict) else None
    if not isinstance(user_id, str) or not user_id.strip():
        raise ValueError("Supabase user endpoint returned no id")
    return user_id.strip(), {}


async def verify_supabase_access_token(token: str) -> VerifiedSupabaseToken:
    secret = _get_supabase_jwt_secret()
    base_url = _get_supabase_base_url()
    anon_key = _get_supabase_anon_key()

    header = jwt.get_unverified_header(token)
    alg = (header.get("alg") or "").upper()

    claims: Dict[str, Any] = {}

    if alg.startswith("HS") and secret:
        claims = _decode_with_secret(token, secret)
    elif alg.startswith("RS") and base_url:
        claims = await _decode_with_jwks(token, base_url)
    elif secret:
        # Last-ditch: try secret for unknown alg
        claims = _decode_with_secret(token, secret)
    elif base_url and anon_key:
        user_id, _ = await _verify_via_supabase_user_endpoint(token, base_url, anon_key)
        return VerifiedSupabaseToken(user_id=user_id, claims={})
    elif base_url:
        # If we have a base URL but no anon key, try JWKS anyway (some projects use RS256)
        claims = await _decode_with_jwks(token, base_url)
    else:
        raise ValueError("Supabase auth verification is not configured on server")

    user_id = _extract_user_id(claims)
    if not user_id:
        raise ValueError("JWT missing user id (sub)")
    return VerifiedSupabaseToken(user_id=user_id, claims=claims)


async def get_supabase_user_id_from_request(request: Request, required: bool) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if not auth:
        if required:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        return None

    parts = auth.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        if required:
            raise HTTPException(status_code=401, detail="Invalid Authorization header")
        return None

    token = parts[1].strip()
    try:
        verified = await verify_supabase_access_token(token)
        return verified.user_id
    except Exception:
        if required:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return None

