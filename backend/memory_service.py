"""
memU Integration Service
사용자 행동 패턴을 memU에 저장하고, AI 추천 시 개인화된 컨텍스트를 제공합니다.
memU API: http://localhost:8100
"""
import os
import json
import httpx
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

MEMU_BASE_URL = os.getenv("MEMU_URL", "http://localhost:8100")


async def memorize_user_action(user_id: str, action_type: str, data: dict):
    """사용자 행동을 memU에 기록"""
    try:
        content = (
            f"[{datetime.now().isoformat()}] User {user_id} - {action_type}\n"
            f"Data: {json.dumps(data, ensure_ascii=False, default=str)}"
        )
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{MEMU_BASE_URL}/memorize",
                json={
                    "content": content,
                    "metadata": {
                        "user_id": user_id,
                        "action_type": action_type,
                        "source": "dailywave",
                    },
                },
            )
    except Exception as e:
        logger.warning(f"memU memorize failed (non-critical): {e}")


async def retrieve_user_context(user_id: str, query: str) -> Optional[str]:
    """memU에서 사용자 관련 컨텍스트를 가져옴"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{MEMU_BASE_URL}/retrieve",
                json={
                    "query": f"user:{user_id} {query}",
                    "top_k": 5,
                },
            )
            if response.status_code == 200:
                data = response.json()
                memories = data.get("memories", data.get("results", []))
                if memories:
                    return "\n".join(
                        m.get("content", m.get("text", "")) for m in memories if m
                    )
    except Exception as e:
        logger.warning(f"memU retrieve failed (non-critical): {e}")
    return None


async def check_similar(content: str) -> bool:
    """중복 콘텐츠 확인"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{MEMU_BASE_URL}/check-similar",
                json={"content": content},
            )
            if response.status_code == 200:
                return response.json().get("is_similar", False)
    except Exception:
        pass
    return False
