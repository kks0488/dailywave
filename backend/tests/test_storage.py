import pytest
import json
import os
from storage import StorageManager, DEFAULT_INITIAL_DATA


class TestStorageManager:
    """Test StorageManager persistence functionality"""

    @pytest.fixture
    def temp_storage(self, tmp_path):
        """Create a temporary storage manager for testing"""
        # Patch the DATA_DIR and DATA_FILE to use tmp_path
        import storage
        original_data_dir = storage.DATA_DIR
        original_data_file = storage.DATA_FILE

        storage.DATA_DIR = str(tmp_path)
        storage.DATA_FILE = str(tmp_path / "workflow_data.json")

        manager = StorageManager()

        yield manager

        # Restore original paths
        storage.DATA_DIR = original_data_dir
        storage.DATA_FILE = original_data_file

    def test_save_and_load_roundtrip(self, temp_storage):
        """Save and load should preserve data"""
        test_data = {
            "pipelines": [
                {"id": "p1", "title": "Test Pipeline"}
            ],
            "routines": [
                {"id": "r1", "title": "Morning Routine", "time": "08:00"}
            ],
            "sopLibrary": [],
            "completionHistory": [
                {"id": "e1", "at": "2026-01-29T00:00:00Z", "type": "session_start"}
            ],
            "chaosInbox": [
                {"id": "c1", "text": "Brain dump", "createdAt": "2026-01-29T00:00:00Z", "status": "inbox", "parsed": None}
            ],
        }

        # Save
        success = temp_storage.save_state(test_data)
        assert success is True

        # Load
        loaded = temp_storage.load_state()
        assert loaded == test_data
        assert loaded["pipelines"][0]["title"] == "Test Pipeline"
        assert loaded["routines"][0]["time"] == "08:00"

    def test_load_state_returns_default_when_no_file(self, temp_storage, tmp_path):
        """Load should return default data when file doesn't exist"""
        # Ensure file doesn't exist
        data_file = tmp_path / "workflow_data.json"
        if data_file.exists():
            data_file.unlink()

        loaded = temp_storage.load_state()
        assert loaded == DEFAULT_INITIAL_DATA
        assert loaded["pipelines"] == []
        assert loaded["routines"] == []
        assert loaded["sopLibrary"] == []
        assert loaded["completionHistory"] == []
        assert loaded["chaosInbox"] == []

    def test_load_state_returns_default_when_empty(self, temp_storage, tmp_path):
        """Load should return default data when saved data is empty"""
        empty_data = {
            "pipelines": [],
            "routines": [],
            "sopLibrary": [],
            "completionHistory": [],
            "chaosInbox": [],
        }

        temp_storage.save_state(empty_data)
        loaded = temp_storage.load_state()

        assert loaded == DEFAULT_INITIAL_DATA

    def test_save_state_returns_true_on_success(self, temp_storage):
        """Save should return True on success"""
        data = {"pipelines": [], "routines": [], "sopLibrary": [], "completionHistory": [], "chaosInbox": []}
        result = temp_storage.save_state(data)
        assert result is True

    def test_save_state_creates_data_dir(self, tmp_path):
        """Save should create data directory if it doesn't exist"""
        import storage

        new_dir = tmp_path / "new_data_dir"
        storage.DATA_DIR = str(new_dir)
        storage.DATA_FILE = str(new_dir / "workflow_data.json")

        manager = StorageManager()

        assert new_dir.exists()

        # Cleanup
        storage.DATA_DIR = os.path.join(os.path.dirname(storage.__file__), "data")
        storage.DATA_FILE = os.path.join(storage.DATA_DIR, "workflow_data.json")

    def test_save_preserves_unicode(self, temp_storage):
        """Save should preserve Unicode characters"""
        data = {
            "pipelines": [],
            "routines": [
                {"id": "r1", "title": "아침 루틴 🌅", "time": "08:00"}
            ],
            "sopLibrary": [],
            "completionHistory": [],
            "chaosInbox": [],
        }

        temp_storage.save_state(data)
        loaded = temp_storage.load_state()

        assert loaded["routines"][0]["title"] == "아침 루틴 🌅"
