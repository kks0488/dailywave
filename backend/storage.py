import json
import os
import threading
import logging
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
logger = logging.getLogger(__name__)

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
        except OSError:
            logger.exception("Error saving state to %s", DATA_FILE)
            return False
        except Exception:
            logger.exception("Unexpected error while saving state.")
            return False

    def load_state(self) -> Dict[str, Any]:
        """Loads the workflow state from a JSON file. Returns empty state if empty/missing."""
        data = None
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except (OSError, json.JSONDecodeError):
                logger.exception("Error loading state from %s", DATA_FILE)
            except Exception:
                logger.exception("Unexpected error while loading state.")
        
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
