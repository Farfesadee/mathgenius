# Backend Tests

## Structure

```
tests/
├── conftest.py          # Pytest fixtures and configuration
├── test_main.py         # Core API tests
├── test_solve.py        # Math solver tests
├── test_teach.py        # Tutoring endpoint tests
├── test_tracking.py     # Analytics tracking tests
└── README.md            # This file
```

## Running Tests

### All tests
```bash
pytest
```

### Specific test file
```bash
pytest backend/tests/test_solve.py
```

### Specific test function
```bash
pytest backend/tests/test_solve.py::test_solve_simple_equation
```

### With coverage
```bash
pytest --cov=app --cov-report=html
```

### Watch mode (auto-rerun on changes)
```bash
pip install pytest-watch
ptw
```

### Only unit tests
```bash
pytest -m unit
```

## Writing Tests

### Basic structure
```python
import pytest

@pytest.mark.unit
def test_something(client):
    """Test description."""
    response = client.post("/endpoint/", json={"key": "value"})
    assert response.status_code == 200
```

### Available fixtures
- `client` — FastAPI TestClient for making requests
- `mock_auth_header` — Authorization header for protected routes

### Markers
- `@pytest.mark.unit` — Unit tests (fast, isolated)
- `@pytest.mark.integration` — Integration tests (slower, may use real DB)
- `@pytest.mark.slow` — Slow-running tests

Run only unit tests:
```bash
pytest -m unit
```

## Test Coverage Goals

- **Minimum**: 20% coverage (happy path)
- **Target**: 60%+ coverage (all major flows)
- **Excellent**: 80%+ coverage (edge cases included)

Current coverage: See `htmlcov/index.html` after running with `--cov-report=html`

## Common Patterns

### Testing a POST endpoint
```python
def test_create_something(client):
    response = client.post("/endpoint/", json={"field": "value"})
    assert response.status_code == 201
    assert "id" in response.json()
```

### Testing validation errors
```python
def test_invalid_input(client):
    response = client.post("/endpoint/", json={"field": ""})
    assert response.status_code == 422  # Validation error
```

### Testing with authentication
```python
def test_protected_endpoint(client, mock_auth_header):
    response = client.get("/protected/", headers=mock_auth_header)
    assert response.status_code == 200
```

### Mocking external services
```python
from unittest.mock import patch

@patch("app.services.groq_service.ask_groq")
def test_with_mock(mock_groq, client):
    mock_groq.return_value = "mocked response"
    response = client.post("/teach/ask", json={"question": "..."})
    assert response.status_code == 200
```

## Debugging Tests

### Print debug info
```python
def test_something(client):
    response = client.post("/endpoint/", json={})
    print(response.json())  # Will print when test fails
    assert False  # Trigger failure to see print output
```

### Use pytest's `-s` flag
```bash
pytest -s backend/tests/test_solve.py
```

### Drop into debugger
```python
def test_something(client):
    breakpoint()  # Debugger will pause here
    response = client.post("/endpoint/")
```

## Continuous Integration

Tests run automatically on:
- Every push to GitHub
- Every pull request
- Schedule: Daily at midnight

See `.github/workflows/ci.yml` for configuration.

## Next Steps

1. Increase coverage to 60%+ before major release
2. Add integration tests for database operations
3. Add performance benchmarks for critical paths
4. Set up load testing before production deployment
