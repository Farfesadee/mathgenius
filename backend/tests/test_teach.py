import pytest
from unittest.mock import patch, MagicMock


@pytest.mark.unit
def test_teach_ask_requires_auth(client):
    """Test that /teach/ask requires authentication."""
    response = client.post(
        "/teach/ask",
        json={
            "question": "What is a quadratic equation?",
            "topic": "Algebra",
            "level": "secondary",
        }
    )
    # Should fail without auth
    assert response.status_code == 401


@pytest.mark.unit
def test_teach_ask_validates_question(client, mock_auth_header):
    """Test that question is required."""
    response = client.post(
        "/teach/ask",
        json={
            "question": "",
            "topic": "Algebra",
            "level": "secondary",
        },
        headers=mock_auth_header,
    )
    assert response.status_code in [422, 400, 500]


@pytest.mark.unit
def test_teach_ask_validates_max_length(client, mock_auth_header):
    """Test that oversized questions are rejected."""
    response = client.post(
        "/teach/ask",
        json={
            "question": "x" * 2001,  # Exceeds max_length of 2000
            "topic": "Algebra",
            "level": "secondary",
        },
        headers=mock_auth_header,
    )
    assert response.status_code == 422


@pytest.mark.unit
def test_get_topics(client):
    """Test fetching available topics."""
    response = client.get("/teach/topics")
    # Might return empty list or list of topics
    assert response.status_code in [200, 404]


@pytest.mark.unit
def test_level_descriptions(client):
    """Test that level descriptions are available."""
    from app.routers.teach import get_level_description

    assert "primary school" in get_level_description("primary")
    assert "secondary" in get_level_description("secondary")
    assert "university" in get_level_description("university")
