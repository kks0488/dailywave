import os
import json
import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from memory_service import retrieve_user_context, memorize_user_action
from rate_limiter import get_rate_limiter
from supabase_auth import get_supabase_user_id_from_request, is_supabase_auth_required_for_ai

router = APIRouter(prefix="/api/ai", tags=["AI"])

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent"


class AIRequest(BaseModel):
    prompt: str
    context: Optional[dict] = None
    system_prompt: Optional[str] = None
    user_id: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048


@router.get("/status")
async def ai_status(request: Request):
    """Lightweight status for frontend gating (safe to expose)."""
    gemini_configured = bool(os.getenv("GEMINI_API_KEY", "").strip())
    memu_reachable = bool(getattr(request.app.state, "memu_available", False))
    require_auth = is_supabase_auth_required_for_ai()

    # Report configured limits for UX messaging (not security-critical).
    try:
        per_minute = int(os.getenv("AI_RATE_LIMIT_PER_MINUTE", "30") or 30)
    except (TypeError, ValueError):
        per_minute = 30
    try:
        per_hour = int(os.getenv("AI_RATE_LIMIT_PER_HOUR", "300") or 300)
    except (TypeError, ValueError):
        per_hour = 300

    return {
        "ai_proxy_reachable": True,
        "gemini_configured": gemini_configured,
        "memu_reachable": memu_reachable,
        "require_supabase_auth_for_ai": require_auth,
        "rate_limits": {
            "per_minute": per_minute,
            "per_hour": per_hour,
        },
    }


@router.post("/ask")
async def ask_ai(req: AIRequest, request: Request):
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured on server")

    require_auth = is_supabase_auth_required_for_ai()
    user_id_from_token = await get_supabase_user_id_from_request(request, required=require_auth)

    # Rate limiting: per user (preferred), else by IP.
    limiter = get_rate_limiter()
    limiter_key = user_id_from_token or (request.client.host if request.client else "unknown")
    decision = await limiter.consume_ai(limiter_key, cost=1)
    if not decision.allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again shortly.",
            headers={"Retry-After": str(decision.retry_after_seconds)},
        )

    text_parts = ""
    if req.system_prompt:
        text_parts += req.system_prompt + "\n\n"

    # memU: Inject personalized context from memory
    effective_user_id = user_id_from_token or req.user_id
    if effective_user_id:
        memory_context = await retrieve_user_context(effective_user_id, req.prompt)
        if memory_context:
            text_parts += f"User memory (past patterns & preferences):\n{memory_context}\n\n"

    if req.context:
        text_parts += f"Context: {json.dumps(req.context)}\n\n"
    text_parts += f"User request: {req.prompt}"

    payload = {
        "contents": [{"parts": [{"text": text_parts}]}],
        "generationConfig": {
            "temperature": req.temperature,
            "maxOutputTokens": req.max_tokens,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GEMINI_API_URL,
                params={"key": api_key},
                json=payload,
            )

        if response.status_code != 200:
            error_detail = response.text
            raise HTTPException(status_code=response.status_code, detail=f"Gemini API error: {error_detail}")

        data = response.json()
        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

        # memU: Record this AI interaction for learning
        if effective_user_id:
            await memorize_user_action(effective_user_id, "ai_interaction", {
                "prompt_summary": req.prompt[:200],
                "response_summary": text[:200],
            })

        return {"text": text}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Gemini API request timed out")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI proxy error: {str(e)}")
