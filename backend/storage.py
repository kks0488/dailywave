import json
import os
import threading
from typing import Dict, Any

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "workflow_data.json")

DEFAULT_INITIAL_DATA = {
    "pipelines": [],
    "routines": [],
    "sopLibrary": [],
    "completionHistory": [],
    "chaosInbox": [],
}

class StorageManager:
    def __init__(self):
        self._lock = threading.Lock()
        self._ensure_data_dir()

    def _ensure_data_dir(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)

    def save_state(self, data: Dict[str, Any]):
        """Saves the workflow state to a JSON file with thread safety."""
        try:
            with self._lock:
                tmp_file = DATA_FILE + ".tmp"
                with open(tmp_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                os.replace(tmp_file, DATA_FILE)
            return True
        except Exception as e:
            print(f"Error saving state: {e}")
            return False

    def load_state(self) -> Dict[str, Any]:
        """Loads the workflow state from a JSON file. Returns empty state if empty/missing."""
        data = None
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except Exception as e:
                print(f"Error loading state: {e}")
        
        # If no data or all arrays empty, return empty defaults
        if not data or (
            not data.get("pipelines", [])
            and not data.get("routines", [])
            and not data.get("sopLibrary", [])
            and not data.get("completionHistory", [])
            and not data.get("chaosInbox", [])
        ):
            return DEFAULT_INITIAL_DATA
            
        return data
