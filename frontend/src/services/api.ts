import { DashboardStats, Order, Customer, Reminder, VoiceInteraction, VoiceProcessResult, LanguageCode } from '../types';

const API_BASE = '/api';

export const api = {
  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    const data = await res.json();
    return data.data;
  },

  async processVoice(transcript: string, language: LanguageCode = 'en-IN', autoExecute: boolean = true): Promise<VoiceProcessResult> {
    const res = await fetch(`${API_BASE}/voice/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, language, auto_execute: autoExecute }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to process voice command');
    return data.data;
  },

  async confirmVoiceAction(
    interactionId: string,
    confirmed: boolean = true,
    editedData?: Record<string, any>
  ): Promise<{ status: string; spoken_response: string; executed_result?: any }> {
    const res = await fetch(`${API_BASE}/voice/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interaction_id: interactionId,
        confirmed,
        edited_data: editedData,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to confirm action');
    return data.data;
  },

  async getOrders(status?: string, search?: string): Promise<Order[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/orders?${params.toString()}`);
    const data = await res.json();
    return data.data || [];
  },

  async createOrder(order: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to create order');
    return data.data;
  },

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    await fetch(`${API_BASE}/orders/${orderId}/status?status=${status}`, { method: 'PATCH' });
  },

  async deleteOrder(orderId: string): Promise<void> {
    await fetch(`${API_BASE}/orders/${orderId}`, { method: 'DELETE' });
  },

  async getCustomers(search?: string): Promise<Customer[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/customers?${params.toString()}`);
    const data = await res.json();
    return data.data || [];
  },

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to create customer');
    return data.data;
  },

  async getReminders(status?: string): Promise<Reminder[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    const res = await fetch(`${API_BASE}/reminders?${params.toString()}`);
    const data = await res.json();
    return data.data || [];
  },

  async createReminder(reminder: Partial<Reminder>): Promise<Reminder> {
    const res = await fetch(`${API_BASE}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reminder),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to create reminder');
    return data.data;
  },

  async toggleReminder(reminderId: string): Promise<string> {
    const res = await fetch(`${API_BASE}/reminders/${reminderId}/toggle`, { method: 'PATCH' });
    const data = await res.json();
    return data.data.status;
  },

  async deleteReminder(reminderId: string): Promise<void> {
    await fetch(`${API_BASE}/reminders/${reminderId}`, { method: 'DELETE' });
  },

  async getVoiceHistory(): Promise<VoiceInteraction[]> {
    const res = await fetch(`${API_BASE}/voice/history`);
    const data = await res.json();
    return data.data || [];
  },

  async getSettings(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    return data.data;
  },
};
