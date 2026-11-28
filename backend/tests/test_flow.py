import pytest
import os
from fastapi.testclient import TestClient

# Use separate test db

from app.main import app  # noqa: F401
from conftest import DEMO_SHOP, reset_demo_shop, shop_client

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    reset_demo_shop()
    yield

client = shop_client()

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["zero_key_ready"] is True

def test_end_to_end_voice_order_workflow():
    # 1. User says: "Add an order for Rahul. 20 shirts, total 15000 rupees."
    process_resp = client.post("/api/voice/process", json={
        "transcript": "Add an order for Rahul. 20 shirts, total 15000 rupees.",
        "language": "en-IN"
    })
    assert process_resp.status_code == 200
    data = process_resp.json()["data"]
    assert data["intent"] == "create_order"
    assert data["confirmation_required"] is True
    assert data["status"] == "pending_confirmation"
    interaction_id = data["interaction_id"]
    assert interaction_id is not None
    assert "Rahul" in data["extracted_data"]["customer_name"]
    assert data["extracted_data"]["quantity"] == 20
    assert data["extracted_data"]["total_amount"] == 15000.0

    # 2. User confirms: "Yes, save it"
    confirm_resp = client.post("/api/voice/confirm", json={
        "interaction_id": interaction_id,
        "confirmed": True
    })
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()["data"]
    assert confirm_data["status"] == "executed"
    assert "saved successfully" in confirm_data["spoken_response"]

    # 3. Verify order exists in the orders database
    orders_resp = client.get("/api/orders?search=Rahul")
    assert orders_resp.status_code == 200
    orders = orders_resp.json()["data"]
    matching_order = [o for o in orders if o["total_amount"] == 15000.0 and o["quantity"] == 20]
    assert len(matching_order) >= 1

    # 4. Verify dashboard stats reflect the new order
    stats_resp = client.get("/api/dashboard/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()["data"]
    assert stats["total_orders"] >= 1
    assert stats["total_revenue"] >= 15000.0
