import { apiFetch } from './auth';

export interface AdminShop {
  id: string;
  name: string;
  city: string;
  owner_name: string;
  phone: string;
  status: 'active' | 'suspended';
  created_at: string;
  owner_login: string;
  last_login_at: string | null;
  stats: {
    customers: number;
    orders: number;
    outstanding: number;
    voice_commands: number;
    voice_signatures: number;
    last_activity: string | null;
  };
}

export interface AdminOverview {
  shops: number;
  active_shops: number;
  customers: number;
  outstanding: number;
  voice_commands: number;
  voice_signatures: number;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data.detail;
    throw new Error(typeof d === 'string' ? d : Array.isArray(d) ? d.map((x: any) => x.msg).join(', ') : 'Request failed');
  }
  return data.data as T;
}
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const adminApi = {
  overview: () => call<AdminOverview>('/api/admin/overview'),
  shops: () => call<AdminShop[]>('/api/admin/shops'),
  createShop: (shop: { name: string; city: string; owner_name: string; phone: string; login: string; password?: string; with_demo_data: boolean }) =>
    call<{ shop: AdminShop; login: string; password: string }>('/api/admin/shops', json('POST', shop)),
  setStatus: (id: string, status: 'active' | 'suspended') => call<AdminShop>(`/api/admin/shops/${id}`, json('PATCH', { status })),
  resetPassword: (id: string) => call<{ login: string; password: string }>(`/api/admin/shops/${id}/reset-password`, json('POST')),
};
