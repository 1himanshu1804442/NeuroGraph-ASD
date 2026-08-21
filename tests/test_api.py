"""
Integration tests for FastAPI endpoints using TestClient.
"""

import pytest
from fastapi.testclient import TestClient
from src.api.server import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health endpoint returns status 200 and valid schema."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"
    assert data["model_loaded"] is True


def test_samples_endpoint():
    """Verify pre-canned clinical samples endpoint."""
    response = client.get("/api/samples")
    assert response.status_code == 200
    data = response.json()
    assert "cases" in data
    assert len(data["cases"]) >= 2


def test_predict_endpoint_with_preset():
    """Verify inference endpoint runs successfully on preset case."""
    payload = {
        "demographics": {
            "subject_id": "TEST_CASE_ASD",
            "age": 10.5,
            "sex": 1,
            "full_scale_iq": 95.0,
            "site_id": "TEST_CLINIC"
        },
        "preset_case": "asd_sample"
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["subject_id"] == "TEST_CASE_ASD"
    assert data["predicted_class"] in [0, 1]
    assert "asd_probability" in data
    assert "control_probability" in data
    assert len(data["top_pathways"]) > 0
    assert "connectome_graph" in data
    assert len(data["connectome_graph"]["nodes"]) == 116
