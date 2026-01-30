import os
import json
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from memory_service import retrieve_user_context, memorize_user_action

router = APIRouter(prefix="/api/ai", tags=["AI"])

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent"


class AIRequest(BaseModel):
    prompt: str
    context: Optional[dict] = None
    system_prompt: Optional[str] = None
    user_id: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048


@router.post("/ask")
async def ask_ai(req: AIRequest):
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured on server")

    text_parts = ""
    if req.system_prompt:
        text_parts += req.system_prompt + "\n\n"

    # memU: Inject personalized context from memory
    if req.user_id:
        memory_context = await retrieve_user_context(req.user_id, req.prompt)
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
        if req.user_id:
            await memorize_user_action(req.user_id, "ai_interaction", {
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
