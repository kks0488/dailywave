import os
from typing import Optional

import httpx
from fastapi import HTTPException

from supabase_auth import _get_supabase_base_url


def _get_service_role_key() -> str:
    return (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE") or "").strip()


def _get_admin_base_url() -> str:
    base = _get_supabase_base_url()
    return base.rstrip("/")


async def delete_user(user_id: str) -> None:
    user_id = (user_id or "").strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user id")

    base_url = _get_admin_base_url()
    if not base_url:
        raise HTTPException(status_code=503, detail="Supabase is not configured on server")

    service_role_key = _get_service_role_key()
    if not service_role_key:
        raise HTTPException(status_code=503, detail="Supabase service role key is not configured on server")

    url = f"{base_url}/auth/v1/admin/users/{user_id}"
    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.delete(url, headers=headers)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to reach Supabase admin API")

    if res.status_code in {200, 202, 204}:
        return

    detail: Optional[str] = None
    try:
        data = res.json()
        if isinstance(data, dict):
            msg = data.get("msg") or data.get("message") or data.get("error_description") or data.get("error")
            if isinstance(msg, str) and msg.strip():
                detail = msg.strip()
    except Exception:
        detail = None

    raise HTTPException(
        status_code=502,
        detail=detail or f"Supabase admin delete failed ({res.status_code})",
    )

