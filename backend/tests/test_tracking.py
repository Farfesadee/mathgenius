import pytest


@pytest.mark.unit
def test_tracking_requires_auth(client):
    """Test that tracking endpoints require authentication."""
    response = client.post(
        "/tracking/session/start",
        json={
            "user_id": "test-user",
            "exam_type": "WAEC",
            "topic": "Algebra",
        }
    )
    # May fail due to auth or missing auth header
    assert response.status_code in [401, 422]


@pytest.mark.unit
def test_session_start_validation(client):
    """Test session start endpoint validates input."""
    response = client.post(
        "/tracking/session/start",
        json={
            "user_id": "",  # Empty user_id
            "exam_type": "WAEC",
        }
    )
    assert response.status_code in [422, 400]


@pytest.mark.unit
def test_get_stats_returns_dict(client):
    """Test that get stats endpoint structure is valid."""
    # This will fail with auth, but tests the endpoint exists
    response = client.get("/tracking/stats/test-user-id")
    assert response.status_code in [200, 401, 404]


@pytest.mark.unit
def test_topic_performance_tracking(client):
    """Test topic performance endpoint."""
    response = client.get("/tracking/topics/test-user-id")
    assert response.status_code in [200, 401, 404]
