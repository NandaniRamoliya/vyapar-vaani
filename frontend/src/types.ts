export type LanguageCode = 'en-IN' | 'hi-IN' | 'gu-IN';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  business_notes: string;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id?: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  created_at: string;
}

export interface Reminder {
  id: string;
  customer_id?: string;
  customer_name?: string;
  title: string;
  reminder_date: string;
  reminder_time: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface VoiceInteraction {
  id: string;
  transcript: string;
  intent: string;
  language: string;
  extracted_data: Record<string, any>;
  confirmation_prompt: string;
  spoken_response: string;
  status: string;
  created_at: string;
}

export interface DashboardStats {
  total_customers: number;
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  today_reminders: number;
  total_outstanding?: number;
  customers_with_dues?: number;
  recent_activity: {
    type: 'order' | 'voice' | 'khata';
    id: string;
    title: string;
    subtitle: string;
    timestamp: string;
  }[];
}

export interface VoiceProcessResult {
  interaction_id: string;
  transcript: string;
  intent: string;
  language: string;
  extracted_data: {
    customer_name?: string;
    product_name?: string;
    quantity?: number;
    total_amount?: number;
    title?: string;
    reminder_date?: string;
    reminder_time?: string;
    name?: string;
    phone?: string;
    [key: string]: any;
  };
  confirmation_required: boolean;
  confirmation_prompt: string;
  spoken_response: string;
  status: string;
  executed_result?: any;
}

export type LedgerEntryType = 'credit' | 'payment';

export interface LedgerEntry {
  id: string;
  customer_id: string;
  customer_name: string;
  entry_type: LedgerEntryType;
  amount: number;
  note: string;
  source: 'voice' | 'manual' | 'order';
  order_id?: string | null;
  created_at: string;
  running_balance?: number;
}

export interface KhataAccount {
  customer_id: string;
  customer_name: string;
  phone: string;
  balance: number;
  total_credit: number;
  total_paid: number;
  last_entry_at: string | null;
  last_payment_at: string | null;
  days_since_payment: number | null;
  never_paid: boolean;
  entry_count: number;
}

export interface KhataSummary {
  total_outstanding: number;
  customers_with_dues: number;
  collected_this_month: number;
  accounts: KhataAccount[];
}

export interface CustomerLedger {
  customer: Customer;
  balance: number;
  total_credit: number;
  total_paid: number;
  last_payment_at: string | null;
  entries: LedgerEntry[];
}
