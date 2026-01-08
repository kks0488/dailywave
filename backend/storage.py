import json
import os
from typing import Dict, Any

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "workflow_data.json")

DEFAULT_INITIAL_DATA = {
    "pipelines": [],
    "routines": [],
    "sopLibrary": []
}

class StorageManager:
    def __init__(self):
        self._ensure_data_dir()

    def _ensure_data_dir(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)

    def save_state(self, data: Dict[str, Any]):
        """Saves the workflow state to a JSON file."""
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
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
        if not data or (not data.get("pipelines", []) and not data.get("routines", [])):
            return DEFAULT_INITIAL_DATA
            
        return data
