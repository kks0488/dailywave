import supabase_admin
import supabase_auth
from supabase_auth import VerifiedSupabaseToken


def test_delete_account_requires_bearer_token(client):
    res = client.delete("/api/auth/account")
    assert res.status_code == 401


def test_delete_account_calls_supabase_admin_delete(client, monkeypatch):
    async def fake_verify(token: str):
        return VerifiedSupabaseToken(user_id="user-123", claims={})

    deleted = {}

    async def fake_delete_user(user_id: str):
        deleted["user_id"] = user_id

    monkeypatch.setattr(supabase_auth, "verify_supabase_access_token", fake_verify)
    monkeypatch.setattr(supabase_admin, "delete_user", fake_delete_user)

    res = client.delete("/api/auth/account", headers={"Authorization": "Bearer test-token"})
    assert res.status_code == 204
    assert deleted.get("user_id") == "user-123"


def test_delete_account_rejects_invalid_auth_header(client):
    res = client.delete("/api/auth/account", headers={"Authorization": "Token abc"})
    assert res.status_code == 401

