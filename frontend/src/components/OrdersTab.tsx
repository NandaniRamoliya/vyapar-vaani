import React, { useMemo, useState } from 'react';
import { Search, Plus, X, MessageCircle, Trash2, Truck, Download, Mic } from 'lucide-react';
import { LanguageCode, Order } from '../types';
import { api } from '../services/api';
import { ago, useT } from '../utils/i18n';
import { SHOP_NAME, formatINR, openWhatsApp } from '../utils/whatsapp';

interface Props {
  orders: Order[];
  language: LanguageCode;
  onRefresh: () => void;
  onOpenVoice: () => void;
}

const STATUS_CLS: Record<Order['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-600',
};

export const OrdersTab: React.FC<Props> = ({ orders, language, onRefresh, onOpenVoice }) => {
  const tr = useT(language);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Order['status']>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('1');
  const [total, setTotal] = useState('');
  const [udhar, setUdhar] = useState(false);
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(
      (o) => (filter === 'all' || o.status === filter) && (!q || o.customer_name.toLowerCase().includes(q) || o.product_name.toLowerCase().includes(q)),
    );
  }, [orders, search, filter]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.trim() || !item.trim() || !Number(total)) return;
    setSaving(true);
    try {
      await api.createOrder({
        customer_name: customer.trim(),
        product_name: item.trim(),
        quantity: Number(qty) || 1,
        total_amount: Number(total),
        status: 'confirmed',
        payment_mode: udhar ? 'udhar' : 'paid',
      } as Partial<Order>);
      setFormOpen(false);
      setCustomer('');
      setItem('');
      setQty('1');
      setTotal('');
      setUdhar(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (o: Order) => {
    if (!window.confirm(tr('ord.confirmDelete'))) return;
    try {
      await api.deleteOrder(o.id);
      onRefresh();
    } catch (err: any) {
      window.alert(err?.message);
    }
  };

  const sendBill = (o: Order) =>
    openWhatsApp(undefined, `*${SHOP_NAME}*\n${o.customer_name}\n${o.quantity} × ${o.product_name}\nTotal: ${formatINR(o.total_amount)}\n🙏`);

  const exportCSV = () => {
    const rows = [['Date', 'Customer', 'Item', 'Qty', 'Total', 'Status'], ...list.map((o) => [o.created_at, o.customer_name, o.product_name, o.quantity, o.total_amount, o.status])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `bills_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const statuses: ('all' | Order['status'])[] = ['all', 'pending', 'confirmed', 'delivered'];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 h-12">
          <Search className="w-5 h-5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('common.search')} className="flex-1 bg-transparent text-base focus:outline-none" />
        </div>
        <div className="flex gap-2">
          <button onClick={onOpenVoice} className="h-12 px-4 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 cursor-pointer">
            <Mic className="w-5 h-5" /> <span className="hidden sm:inline">{tr('nav.talk')}</span>
          </button>
          <button onClick={() => setFormOpen(!formOpen)} className="h-12 px-4 rounded-2xl bg-slate-900 text-white font-bold flex items-center gap-2 cursor-pointer">
            {formOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {tr('ord.new')}
          </button>
          <button onClick={exportCSV} aria-label={tr('ord.download')} title={tr('ord.download')} className="h-12 w-12 rounded-2xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center cursor-pointer">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {formOpen && (
        <form onSubmit={save} className="bg-white rounded-3xl border border-slate-200 p-4 grid grid-cols-2 gap-3">
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder={tr('ord.customer')} required className="col-span-2 h-12 px-3 rounded-xl border border-slate-300 text-base" />
          <input value={item} onChange={(e) => setItem(e.target.value)} placeholder={tr('ord.item')} required className="col-span-2 h-12 px-3 rounded-xl border border-slate-300 text-base" />
          <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="1" inputMode="numeric" placeholder={tr('ord.qty')} className="h-12 px-3 rounded-xl border border-slate-300 text-base" />
          <input value={total} onChange={(e) => setTotal(e.target.value)} type="number" min="1" inputMode="decimal" placeholder={tr('ord.total')} required className="h-12 px-3 rounded-xl border border-slate-300 text-base" />
          <div className="col-span-2 grid grid-cols-2 gap-2">
            {[false, true].map((u) => (
              <button key={String(u)} type="button" onClick={() => setUdhar(u)} className={`h-11 rounded-xl font-bold text-sm cursor-pointer ${udhar === u ? (u ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white') : 'bg-slate-100 text-slate-600'}`}>
                {u ? tr('ord.onUdhar') : tr('ord.payNow')}
              </button>
            ))}
          </div>
          <button type="submit" disabled={saving} className="col-span-2 h-12 rounded-2xl bg-slate-900 text-white font-bold cursor-pointer disabled:opacity-60">
            {saving ? tr('common.saving') : tr('common.save')}
          </button>
        </form>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`shrink-0 h-9 px-4 rounded-full text-sm font-bold cursor-pointer ${filter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {s === 'all' ? tr('common.all') : tr(`ord.st.${s}`)}
          </button>
        ))}
      </div>

      {list.length === 0 && <p className="py-10 text-center text-slate-400">{tr('ord.empty')}</p>}
      <div className="space-y-2">
        {list.map((o) => (
          <div key={o.id} className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-slate-900 truncate">{o.customer_name}</p>
                <p className="text-slate-600">
                  {o.quantity} × {o.product_name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{ago(language, o.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-black text-slate-900">{formatINR(o.total_amount)}</p>
                <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[o.status]}`}>{tr(`ord.st.${o.status}`)}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {o.status !== 'delivered' && o.status !== 'cancelled' && (
                <button onClick={async () => { await api.updateOrderStatus(o.id, 'delivered'); onRefresh(); }} className="h-10 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                  <Truck className="w-4 h-4" /> {tr('ord.markDelivered')}
                </button>
              )}
              <button onClick={() => sendBill(o)} className="h-10 px-3 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                <MessageCircle className="w-4 h-4" /> {tr('ord.sendBill')}
              </button>
              <button onClick={() => remove(o)} aria-label={tr('common.delete')} className="h-10 w-10 ml-auto rounded-xl text-slate-300 hover:text-rose-600 flex items-center justify-center cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
