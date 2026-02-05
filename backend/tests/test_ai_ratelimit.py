import time

import jwt


class _DummyResponse:
    status_code = 200
    text = '{"ok": true}'

    def json(self):
        return {
            "candidates": [
                {"content": {"parts": [{"text": "hello"}]}}
            ]
        }


class _DummyAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, *args, **kwargs):
        return _DummyResponse()


async def _noop(*args, **kwargs):
    return None


def _make_token(secret: str, sub: str) -> str:
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "exp": int(time.time()) + 60,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def test_ai_rate_limit_blocks_excess(client, monkeypatch):
    monkeypatch.setenv("REQUIRE_SUPABASE_AUTH_FOR_AI", "1")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-secret")
    monkeypatch.setenv("AI_RATE_LIMIT_PER_MINUTE", "1")
    monkeypatch.setenv("AI_RATE_LIMIT_PER_HOUR", "1")

    import ai_proxy

    monkeypatch.setattr(ai_proxy.httpx, "AsyncClient", _DummyAsyncClient)
    monkeypatch.setattr(ai_proxy, "retrieve_user_context", _noop)
    monkeypatch.setattr(ai_proxy, "memorize_user_action", _noop)

    token = _make_token("test-secret", "00000000-0000-0000-0000-00000000abcd")

    first = client.post(
        "/api/ai/ask",
        json={"prompt": "hi"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert first.status_code == 200

    second = client.post(
        "/api/ai/ask",
        json={"prompt": "hi again"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert second.status_code == 429
    assert "Retry-After" in second.headers

