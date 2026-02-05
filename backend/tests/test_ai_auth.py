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


def test_ai_requires_auth_when_enabled(client, monkeypatch):
    monkeypatch.setenv("REQUIRE_SUPABASE_AUTH_FOR_AI", "1")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-secret")

    res = client.post("/api/ai/ask", json={"prompt": "hi"})
    assert res.status_code == 401


def test_ai_rejects_invalid_token(client, monkeypatch):
    monkeypatch.setenv("REQUIRE_SUPABASE_AUTH_FOR_AI", "1")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-secret")

    res = client.post(
        "/api/ai/ask",
        json={"prompt": "hi"},
        headers={"Authorization": "Bearer not-a-jwt"},
    )
    assert res.status_code == 401


def test_ai_accepts_valid_token(client, monkeypatch):
    monkeypatch.setenv("REQUIRE_SUPABASE_AUTH_FOR_AI", "1")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-secret")

    import ai_proxy

    monkeypatch.setattr(ai_proxy.httpx, "AsyncClient", _DummyAsyncClient)
    monkeypatch.setattr(ai_proxy, "retrieve_user_context", _noop)
    monkeypatch.setattr(ai_proxy, "memorize_user_action", _noop)

    token = _make_token("test-secret", "00000000-0000-0000-0000-000000000001")
    res = client.post(
        "/api/ai/ask",
        json={"prompt": "hi", "user_id": "spoofed"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["text"] == "hello"

