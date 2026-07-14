import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Fixture for FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_auth_header():
    """Mock authorization header for testing protected routes."""
    return {"Authorization": "Bearer test_token_12345"}
