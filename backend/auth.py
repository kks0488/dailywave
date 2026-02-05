import os
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from supabase_auth import get_supabase_user_id_from_request

PUBLIC_PATHS = {"/", "/health", "/api/calendar/feed", "/api/ai/status"}
BEARER_AUTH_PATHS = {"/api/ai/ask", "/api/memory/track", "/api/auth/account"}


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        api_key = os.getenv("API_SECRET_KEY", "")
        if not api_key:
            return await call_next(request)

        provided_key = request.headers.get("X-API-Key", "")
        if provided_key == api_key:
            return await call_next(request)

        if request.url.path in BEARER_AUTH_PATHS:
            user_id = await get_supabase_user_id_from_request(request, required=False)
            if user_id:
                return await call_next(request)

        raise HTTPException(status_code=401, detail="Invalid or missing API key")
