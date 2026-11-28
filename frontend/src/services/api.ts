import {
  DashboardStats, Order, Customer, Reminder, VoiceInteraction, VoiceProcessResult, LanguageCode,
  KhataSummary, CustomerLedger, LedgerEntry, LedgerEntryType, AgentContext, VoiceSignature, ChainCheck, TodaySummary,
} from '../types';
import { localNowISO } from '../utils/i18n';

const API_BASE = '/api';

export const api = {
  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    const data = await res.json();
    return data.data;
  },

  async processVoice(
    transcript: string,
    language: LanguageCode = 'en-IN',
    autoExecute: boolean = false,
    context?: AgentContext,
  ): Promise<VoiceProcessResult> {
    const res = await fetch(`${API_BASE}/voice/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, language, auto_execute: autoExecute, context: context || {}, client_time: localNowISO() }),
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
    if (!res.ok || !data.success) throw new Error(data.detail || data.message || 'Failed to confirm action');
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
    const res = await fetch(`${API_BASE}/orders/${orderId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Could not delete order');
    }
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

  async getToday(): Promise<TodaySummary> {
    const res = await fetch(`${API_BASE}/dashboard/today?now=${encodeURIComponent(localNowISO())}`);
    const data = await res.json();
    return data.data;
  },

  async getDueReminders(): Promise<Reminder[]> {
    const res = await fetch(`${API_BASE}/reminders/due?now=${encodeURIComponent(localNowISO())}`);
    const data = await res.json();
    return data.data || [];
  },

  async snoozeReminder(reminderId: string, minutes = 10): Promise<void> {
    await fetch(`${API_BASE}/reminders/${reminderId}/snooze?minutes=${minutes}&now=${encodeURIComponent(localNowISO())}`, { method: 'PATCH' });
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

  async getKhata(): Promise<KhataSummary> {
    const res = await fetch(`${API_BASE}/khata`);
    const data = await res.json();
    return data.data;
  },

  async getCustomerLedger(customerId: string): Promise<CustomerLedger> {
    const res = await fetch(`${API_BASE}/khata/${customerId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to load khata');
    return data.data;
  },

  async addKhataEntry(entry: {
    customer_id?: string;
    customer_name?: string;
    entry_type: LedgerEntryType;
    amount: number;
    note?: string;
  }): Promise<LedgerEntry & { balance: number }> {
    const res = await fetch(`${API_BASE}/khata/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.detail?.[0]?.msg || data.detail || 'Failed to save khata entry');
    return data.data;
  },

  async deleteKhataEntry(entryId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/khata/entries/${entryId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Could not delete entry');
    }
  },

  async uploadSignature(
    entryId: string,
    audio: Blob,
    durationMs: number,
    phrase: string,
    language: LanguageCode,
  ): Promise<VoiceSignature> {
    const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
    const form = new FormData();
    form.append('audio', audio, `signature.${ext}`);
    form.append('duration_ms', String(durationMs));
    form.append('phrase', phrase);
    form.append('language', language);
    const res = await fetch(`${API_BASE}/khata/entries/${entryId}/signature`, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.detail || 'Could not save the voice signature');
    return data.data;
  },

  async verifySignatures(): Promise<ChainCheck> {
    const res = await fetch(`${API_BASE}/signatures/verify`);
    const data = await res.json();
    return data.data;
  },

  async getSettings(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    return data.data;
  },
};
