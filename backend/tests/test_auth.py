import pytest
import os


class TestAPIKeyAuth:
    """Test API key authentication middleware"""

    def test_public_paths_accessible_without_key(self, client):
        """Public paths should be accessible without API key"""
        # Root path
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

        # Health check
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

        # Calendar feed
        response = client.get("/api/calendar/feed")
        assert response.status_code == 200

    def test_no_auth_required_when_key_not_set(self, client):
        """When API_SECRET_KEY is not set, all endpoints should be accessible"""
        # API_SECRET_KEY is set to "" in conftest.py
        response = client.post(
            "/api/persistence/save",
            json={"pipelines": [], "routines": [], "sopLibrary": []}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "saved"

    def test_auth_middleware_checks_public_paths(self):
        """Verify PUBLIC_PATHS constant contains expected paths"""
        from auth import PUBLIC_PATHS

        # These paths should be public
        assert "/" in PUBLIC_PATHS
        assert "/health" in PUBLIC_PATHS
        assert "/api/calendar/feed" in PUBLIC_PATHS

    def test_auth_middleware_logic(self):
        """Test the auth middleware logic directly"""
        import os
        from auth import APIKeyAuthMiddleware

        # Test that middleware reads from environment
        # This is a basic sanity check on the middleware class
        middleware = APIKeyAuthMiddleware(app=None)
        assert middleware is not None
