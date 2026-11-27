from typing import Optional, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = ""
    business_notes: Optional[str] = ""

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: str
    created_at: str

class OrderBase(BaseModel):
    customer_name: str
    product_name: str
    quantity: int
    total_amount: float
    status: str = "pending" # pending, confirmed, delivered, cancelled

class OrderCreate(OrderBase):
    customer_id: Optional[str] = None

class Order(OrderBase):
    id: str
    customer_id: Optional[str] = None
    created_at: str

class ReminderBase(BaseModel):
    title: str
    reminder_date: str
    reminder_time: str
    status: str = "pending" # pending, completed

class ReminderCreate(ReminderBase):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None

class Reminder(ReminderBase):
    id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    created_at: str

class VoiceInteraction(BaseModel):
    id: str
    transcript: str
    detected_intent: str
    language: str = "en-IN"
    extracted_data: dict[str, Any]
    confirmation_required: bool = True
    confirmation_prompt: str = ""
    spoken_response: str = ""
    execution_status: str = "pending_confirmation" # pending_confirmation, executed, cancelled, failed, info
    created_at: str

class ProcessVoiceRequest(BaseModel):
    transcript: str = Field(..., description="Speech-to-text transcript from user")
    language: str = Field(default="en-IN", description="Language code: en-IN, hi-IN, gu-IN")
    auto_execute: bool = Field(default=False, description="Execute action immediately without extra confirmation step")

class ConfirmActionRequest(BaseModel):
    interaction_id: str
    confirmed: bool = True
    edited_data: Optional[dict[str, Any]] = None

class LedgerEntryCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    entry_type: Literal["credit", "payment"]
    amount: float = Field(..., gt=0)
    note: Optional[str] = ""

class DashboardStats(BaseModel):
    total_customers: int
    total_orders: int
    total_revenue: float
    pending_orders: int
    today_reminders: int
    total_outstanding: float = 0.0
    customers_with_dues: int = 0
    recent_activity: list[dict[str, Any]]

class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
