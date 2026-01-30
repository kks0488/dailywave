import pytest


class TestAPIEndpoints:
    """Integration tests for main.py API endpoints"""

    def test_root_returns_ok(self, client):
        """GET / should return status ok"""
        response = client.get("/")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "ok"
        assert "message" in data
        assert "version" in data

    def test_health_check(self, client):
        """GET /health should return healthy status"""
        response = client.get("/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"

    def test_persistence_save_and_load_roundtrip(self, client):
        """POST /api/persistence/save + GET /api/persistence/load should preserve data"""
        # Prepare test data
        test_data = {
            "pipelines": [
                {
                    "id": "p1",
                    "title": "Test Pipeline",
                    "subtitle": "Test subtitle",
                    "steps": [
                        {"title": "Step 1", "description": "Do something"}
                    ]
                }
            ],
            "routines": [
                {
                    "id": "r1",
                    "title": "Morning Routine",
                    "time": "08:00",
                    "type": "health"
                }
            ],
            "sopLibrary": []
        }

        # Save
        save_response = client.post("/api/persistence/save", json=test_data)
        assert save_response.status_code == 200
        assert save_response.json()["status"] == "saved"

        # Load
        load_response = client.get("/api/persistence/load")
        assert load_response.status_code == 200

        loaded_data = load_response.json()
        assert loaded_data["status"] == "loaded"
        assert "data" in loaded_data

        # Verify data
        data = loaded_data["data"]
        assert len(data["pipelines"]) == 1
        assert data["pipelines"][0]["title"] == "Test Pipeline"
        assert len(data["routines"]) == 1
        assert data["routines"][0]["time"] == "08:00"

    def test_calendar_feed_returns_ics(self, client):
        """GET /api/calendar/feed should return ICS content"""
        response = client.get("/api/calendar/feed")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/calendar; charset=utf-8"

        # Check for ICS structure
        content = response.text
        assert "BEGIN:VCALENDAR" in content
        assert "END:VCALENDAR" in content
        assert "VERSION:2.0" in content

    def test_persistence_save_with_empty_data(self, client):
        """Save should work with empty data"""
        empty_data = {
            "pipelines": [],
            "routines": [],
            "sopLibrary": []
        }

        response = client.post("/api/persistence/save", json=empty_data)
        assert response.status_code == 200
        assert response.json()["status"] == "saved"

    def test_persistence_save_with_unicode(self, client):
        """Save should preserve Unicode characters"""
        unicode_data = {
            "pipelines": [],
            "routines": [
                {
                    "id": "r1",
                    "title": "아침 루틴 🌅",
                    "time": "08:00",
                    "type": "건강"
                }
            ],
            "sopLibrary": []
        }

        # Save
        save_response = client.post("/api/persistence/save", json=unicode_data)
        assert save_response.status_code == 200

        # Load and verify
        load_response = client.get("/api/persistence/load")
        data = load_response.json()["data"]
        assert data["routines"][0]["title"] == "아침 루틴 🌅"
        assert data["routines"][0]["type"] == "건강"

    def test_persistence_load_without_save(self, client):
        """Load should return default data structure even without prior save"""
        response = client.get("/api/persistence/load")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "loaded"
        assert "data" in data
        assert "pipelines" in data["data"]
        assert "routines" in data["data"]
        assert isinstance(data["data"]["pipelines"], list)
        assert isinstance(data["data"]["routines"], list)

    def test_calendar_feed_with_routines(self, client):
        """Calendar feed should include routine events"""
        # First, save some routines
        data_with_routines = {
            "pipelines": [],
            "routines": [
                {
                    "id": "r1",
                    "title": "Morning Exercise",
                    "time": "08:00",
                    "type": "health"
                }
            ],
            "sopLibrary": []
        }

        client.post("/api/persistence/save", json=data_with_routines)

        # Get calendar feed
        response = client.get("/api/calendar/feed")
        content = response.text

        assert "Morning Exercise" in content
        assert "BEGIN:VEVENT" in content
        assert "routine-r1-" in content

    def test_calendar_feed_with_missions(self, client):
        """Calendar feed should include mission events from pipelines"""
        # Save pipelines
        data_with_missions = {
            "pipelines": [
                {
                    "id": "week-mon",
                    "title": "Monday Mission",
                    "subtitle": "Weekly review",
                    "steps": []
                }
            ],
            "routines": [],
            "sopLibrary": []
        }

        client.post("/api/persistence/save", json=data_with_missions)

        # Get calendar feed
        response = client.get("/api/calendar/feed")
        content = response.text

        assert "Monday Mission" in content
        assert "mission-week-mon-" in content
