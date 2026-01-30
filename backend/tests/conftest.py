import pytest
from fastapi.testclient import TestClient
import os

os.environ["API_SECRET_KEY"] = ""
os.environ["GEMINI_API_KEY"] = "test-key"

from main import app

@pytest.fixture
def client():
    return TestClient(app)
