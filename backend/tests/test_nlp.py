import pytest
from app.services.nlp_parser import NLPParser

def test_english_order_extraction():
    transcript = "Add an order for Rahul. 20 shirts, total 15000 rupees."
    result = NLPParser.parse(transcript, "en-IN")
    
    assert result["intent"] == "create_order"
    assert result["confirmation_required"] is True
    data = result["extracted_data"]
    assert "Rahul" in data["customer_name"]
    assert data["quantity"] == 20
    assert data["total_amount"] == 15000.0
    assert "Shirts" in data["product_name"]
    assert "Rahul" in result["confirmation_prompt"]

def test_hindi_order_extraction():
    transcript = "राहुल के लिए 20 शर्ट्स का ऑर्डर जोड़ो कुल 15000 रुपये"
    result = NLPParser.parse(transcript, "hi-IN")
    
    assert result["intent"] == "create_order"
    assert result["confirmation_required"] is True
    data = result["extracted_data"]
    assert data["quantity"] == 20
    assert data["total_amount"] == 15000.0

def test_gujarati_order_extraction():
    transcript = "રાહુલ માટે 20 શર્ટ નો ઓર્ડર ઉમેરો, કુલ 15000 રૂપિયા"
    result = NLPParser.parse(transcript, "gu-IN")
    
    assert result["intent"] == "create_order"
    assert result["confirmation_required"] is True
    data = result["extracted_data"]
    assert data["quantity"] == 20
    assert data["total_amount"] == 15000.0

def test_reminder_extraction():
    transcript = "Remind me to call Rahul tomorrow at 11 AM"
    result = NLPParser.parse(transcript, "en-IN")
    
    assert result["intent"] == "create_reminder"
    assert result["confirmation_required"] is True
    data = result["extracted_data"]
    assert "Rahul" in data["customer_name"]
    assert data["reminder_time"] == "11:00 AM"

def test_customer_extraction():
    transcript = "Add customer Amit Shah with phone 9898123456"
    result = NLPParser.parse(transcript, "en-IN")
    
    assert result["intent"] == "add_customer"
    assert result["confirmation_required"] is True
    data = result["extracted_data"]
    assert "Amit Shah" in data["name"]

def test_query_intents():
    result = NLPParser.parse("Show today's pending orders", "en-IN")
    assert result["intent"] == "list_orders"
    assert result["confirmation_required"] is False

    result_summary = NLPParser.parse("Show business summary", "en-IN")
    assert result_summary["intent"] == "show_business_summary"
    assert result_summary["confirmation_required"] is False
