import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import io
from PIL import Image

from backend.app.main import app
from backend.app.db import init_db, get_connection

client = TestClient(app)

def setup_module():
    init_db()

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "supported_classes_count" in data

def test_model_status():
    response = client.get("/api/model-status")
    assert response.status_code == 200
    data = response.json()
    assert "is_trained" in data
    assert "classes" in data
    assert len(data["classes"]) == 12

def test_produce_categories():
    response = client.get("/api/produce-categories")
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert "apple" in data["categories"]

def test_simulate_sensors():
    response = client.get("/api/simulate-sensors?produce_type=banana&condition=fresh")
    assert response.status_code == 200
    data = response.json()
    assert data["is_simulated"] is True
    assert "gas_ppm" in data
    assert "humidity_pct" in data
    assert "ph_level" in data

def test_inspect_valid_image():
    # Create test image in memory
    img = Image.new("RGB", (100, 100), color=(200, 30, 30))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    response = client.post(
        "/api/inspect",
        files={"file": ("test_apple.jpg", buf, "image/jpeg")},
        data={"produce_category": "apple", "simulate_sensors": "true"}
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "inspection_id" in res["record"]
    assert res["record"]["produce_category"] == "apple"
    assert "food_quality_score" in res["record"]
    assert res["record"]["is_sensor_simulated"] == 1

def test_inspect_invalid_file():
    buf = io.BytesIO(b"Not an image file text content")
    response = client.post(
        "/api/inspect",
        files={"file": ("fake.txt", buf, "text/plain")},
        data={"produce_category": "apple"}
    )
    assert response.status_code == 400

def test_inspections_history_and_detail():
    # Query history
    response = client.get("/api/inspections")
    assert response.status_code == 200
    records = response.json()
    assert isinstance(records, list)
    assert len(records) > 0

    first_id = records[0]["inspection_id"]
    detail_res = client.get(f"/api/inspections/{first_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["inspection_id"] == first_id

def test_dashboard_stats():
    response = client.get("/api/dashboard-stats")
    assert response.status_code == 200
    stats = response.json()
    assert "total_inspections" in stats
    assert stats["total_inspections"] >= 1
    assert "fresh_count" in stats

def test_csv_export():
    response = client.get("/api/export/csv")
    assert response.status_code == 200
    assert "Inspection ID" in response.text
    assert "Produce Category" in response.text

def test_pdf_export():
    # Get last inspection ID
    history = client.get("/api/inspections").json()
    insp_id = history[0]["inspection_id"]
    response = client.get(f"/api/export/pdf/{insp_id}")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 500
