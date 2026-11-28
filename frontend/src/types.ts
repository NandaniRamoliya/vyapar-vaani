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
  kind?: 'call' | 'payment' | 'general';
  due_at?: string;
  phone?: string;
  balance?: number | null;
}

export interface TodaySummary {
  sales_today: number;
  orders_today: number;
  collected_today: number;
  udhar_today: number;
  total_outstanding: number;
  customers_with_dues: number;
  top_dues: { customer_id: string; customer_name: string; phone: string; balance: number; days_since_payment: number | null; never_paid: boolean }[];
  reminders: Reminder[];
  overdue_count: number;
  recent: { type: 'payment' | 'udhar' | 'order'; customer_name: string; amount: number; created_at: string; detail?: string }[];
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
  context?: AgentContext;
  reply_language?: LanguageCode;
  detected_language?: LanguageCode | null;
}

/** Conversation memory the phone keeps and sends with every utterance. */
export interface AgentContext {
  last_customer?: string | null;
  pending?: { intent: string; data: Record<string, any>; missing: string[] } | null;
  last_action?: { type: 'ledger' | 'order'; id: string } | null;
}

export interface VoiceSignature {
  id: string;
  entry_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  phrase: string;
  language: string;
  duration_ms: number | null;
  audio_sha256: string;
  chain_hash: string;
  created_at: string;
  audio_url: string;
}

export interface SignatureRequest {
  entry_id: string;
  customer_name: string;
  first_name: string;
  amount: number;
  phrase: string;
  prompt: string;
  thanks: string;
}

export interface ChainCheck {
  valid: boolean;
  checked: number;
  broken_at?: string;
  customer_name?: string;
  problems?: string[];
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
  signature?: VoiceSignature | null;
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
