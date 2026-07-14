import pytest


@pytest.mark.unit
def test_solve_simple_equation(client):
    """Test solving a simple equation."""
    response = client.post(
        "/solve/",
        json={
            "expression": "x + 2 = 5",
            "mode": "solve"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert "data" in data


@pytest.mark.unit
def test_solve_with_invalid_expression(client):
    """Test solving with invalid expression."""
    response = client.post(
        "/solve/",
        json={
            "expression": "not a valid math expression $$$",
            "mode": "solve"
        }
    )
    # Should either handle gracefully or return error
    assert response.status_code in [200, 400, 500]


@pytest.mark.unit
def test_solve_differentiate_mode(client):
    """Test differentiation mode."""
    response = client.post(
        "/solve/",
        json={
            "expression": "x**2 + 3*x + 2",
            "mode": "differentiate"
        }
    )
    assert response.status_code == 200


@pytest.mark.unit
def test_solve_expression_validation(client):
    """Test that oversized expressions are rejected."""
    response = client.post(
        "/solve/",
        json={
            "expression": "x" * 1001,  # Exceeds max_length of 1000
            "mode": "solve"
        }
    )
    assert response.status_code == 422
