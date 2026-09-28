"""
Integration tests for ComplyAI FastAPI endpoints (Auth, Health, Security)
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "ComplyAI"


def test_user_registration_and_login(client):
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    reg_payload = {
        "email": unique_email,
        "full_name": "Integration Tester",
        "password": "SecurePassword123!",
        "role": "analyst",
    }

    # 1. Register user
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == unique_email
    token = reg_data["access_token"]

    # 2. Prevent duplicate email registration
    dup_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # 3. Test authenticated /me endpoint
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == unique_email
    assert me_data["role"] == "analyst"


def test_invalid_login(client):
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "nonexistent@test.com", "password": "wrongpassword"}
    )
    assert login_res.status_code == 401
