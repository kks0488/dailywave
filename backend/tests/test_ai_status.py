def test_ai_status_returns_fields(client):
    res = client.get("/api/ai/status")
    assert res.status_code == 200

    data = res.json()
    assert data["ai_proxy_reachable"] is True
    assert "gemini_configured" in data
    assert "memu_reachable" in data
    assert "require_supabase_auth_for_ai" in data
    assert "rate_limits" in data
    assert "per_minute" in data["rate_limits"]
    assert "per_hour" in data["rate_limits"]

