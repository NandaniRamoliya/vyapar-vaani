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
  recent_activity: {
    type: 'order' | 'voice';
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
}
