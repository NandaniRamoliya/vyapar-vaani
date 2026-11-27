import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Search,
  IndianRupee,
  Users,
  Wallet,
  MessageCircle,
  Plus,
  Minus,
  Trash2,
  Mic,
  Clock,
  X,
} from 'lucide-react';
import { CustomerLedger, KhataSummary, LedgerEntryType } from '../types';
import { api } from '../services/api';
import { dueAgeLabel, formatINR, openWhatsApp, paymentReminderMessage } from '../utils/whatsapp';

interface KhataTabProps {
  onOpenVoice: () => void;
  onRefresh?: () => void;
  refreshKey?: number;
}

type Filter = 'dues' | 'all' | 'settled';

const balanceClass = (b: number) => (b > 0 ? 'text-rose-700' : b < 0 ? 'text-sky-700' : 'text-emerald-700');
const balanceLabel = (b: number) => (b > 0 ? 'Balance due' : b < 0 ? 'Advance' : 'Settled');

export const KhataTab: React.FC<KhataTabProps> = ({ onOpenVoice, onRefresh, refreshKey }) => {
  const [summary, setSummary] = useState<KhataSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<CustomerLedger | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('dues');

  const [formType, setFormType] = useState<LedgerEntryType | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await api.getKhata();
      setSummary(data);
      setSelectedId((cur) => cur ?? data.accounts.find((a) => a.balance > 0)?.customer_id ?? data.accounts[0]?.customer_id ?? null);
    } catch (e) {
      console.error('Failed to load khata', e);
    }
  }, []);

  const loadLedger = useCallback(async (customerId: string) => {
    try {
      setLedger(await api.getCustomerLedger(customerId));
    } catch (e) {
      console.error('Failed to load ledger', e);
      setLedger(null);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, refreshKey]);

  useEffect(() => {
    if (selectedId) loadLedger(selectedId);
  }, [selectedId, loadLedger, refreshKey]);

  const accounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (summary?.accounts || []).filter((a) => {
      if (filter === 'dues' && a.balance <= 0) return false;
      if (filter === 'settled' && a.balance > 0) return false;
      return !q || a.customer_name.toLowerCase().includes(q) || a.phone.toLowerCase().includes(q);
    });
  }, [summary, search, filter]);

  const openForm = (type: LedgerEntryType) => {
    setFormType(type);
    setAmount('');
    setNote('');
    setFormError(null);
  };

  const submitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !formType) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setFormError('Enter an amount greater than 0');
      return;
    }
    setSaving(true);
    try {
      await api.addKhataEntry({ customer_id: selectedId, entry_type: formType, amount: value, note: note.trim() });
      setFormType(null);
      await Promise.all([loadSummary(), loadLedger(selectedId)]);
      onRefresh?.();
    } catch (err: any) {
      setFormError(err?.message || 'Could not save entry');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!selectedId || !window.confirm('Delete this khata entry? The balance will be recalculated.')) return;
    await api.deleteKhataEntry(entryId);
    await Promise.all([loadSummary(), loadLedger(selectedId)]);
    onRefresh?.();
  };

  const selected = summary?.accounts.find((a) => a.customer_id === selectedId) || null;

  return (
    <div className="space-y-5">
      {/* Headline numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Udhar Outstanding</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-rose-700 tracking-tight">{formatINR(summary?.total_outstanding || 0)}</p>
          <p className="text-xs text-slate-500 mt-1">Money customers owe you</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customers With Dues</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{summary?.customers_with_dues ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Out of {summary?.accounts.length ?? 0} khata accounts</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected This Month</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-700 tracking-tight">{formatINR(summary?.collected_this_month || 0)}</p>
          <p className="text-xs text-slate-500 mt-1">Payments recorded in khata</p>
        </div>
      </div>

      {/* Voice hint */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-indigo-900">
          <span className="font-bold">Hands busy? Just speak:</span> “Rahul ko 5000 udhar likho” · “Priya paid 2000” · “Who owes me money?”
        </p>
        <button
          onClick={onOpenVoice}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          Speak to Khata
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Account list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-[420px]">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5">
              {(['dues', 'all', 'settled'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'dues' ? 'With dues' : f === 'all' ? 'All' : 'Settled'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {accounts.length === 0 && <p className="p-6 text-center text-xs text-slate-400">No khata accounts match.</p>}
            {accounts.map((a) => (
              <button
                key={a.customer_id}
                onClick={() => {
                  setSelectedId(a.customer_id);
                  setFormType(null);
                }}
                className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  a.customer_id === selectedId ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{a.customer_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {a.days_since_payment != null ? (
                      <span className={a.days_since_payment > 30 ? 'text-rose-600 font-semibold' : ''}>
                        {dueAgeLabel(a.days_since_payment, a.never_paid)}
                      </span>
                    ) : (
                      a.phone || 'No phone saved'
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-black ${balanceClass(a.balance)}`}>{formatINR(a.balance)}</p>
                  <p className="text-[10px] text-slate-400">{balanceLabel(a.balance)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ledger detail */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-[420px]">
          {!selected || !ledger ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs p-8">
              <BookOpen className="w-8 h-8 mb-2" />
              Select a customer to see their khata
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-slate-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{selected.customer_name}</h3>
                    <p className="text-xs text-slate-500">{selected.phone || 'No phone saved'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{balanceLabel(ledger.balance)}</p>
                    <p className={`text-3xl font-black tracking-tight ${balanceClass(ledger.balance)}`}>{formatINR(ledger.balance)}</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-[11px] text-slate-500">
                  <span>Total udhar: <b className="text-slate-800">{formatINR(ledger.total_credit)}</b></span>
                  <span>Total paid: <b className="text-slate-800">{formatINR(ledger.total_paid)}</b></span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => openForm('credit')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Udhar Diya (Gave credit)
                  </button>
                  <button
                    onClick={() => openForm('payment')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    Payment Mila (Received)
                  </button>
                  {ledger.balance > 0 && (
                    <button
                      onClick={() => openWhatsApp(selected.phone, paymentReminderMessage(selected.customer_name, ledger.balance))}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp Reminder
                    </button>
                  )}
                </div>

                {formType && (
                  <form onSubmit={submitEntry} className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${formType === 'credit' ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {formType === 'credit' ? 'New udhar entry' : 'New payment entry'}
                      </span>
                      <button type="button" onClick={() => setFormType(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        autoFocus
                        type="number"
                        min="1"
                        step="any"
                        inputMode="decimal"
                        placeholder="Amount (₹)"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="sm:w-36 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder={formType === 'credit' ? 'Note, e.g. 10 kurtis' : 'Note, e.g. UPI / cash'}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    {formError && <p className="text-[11px] text-rose-600">{formError}</p>}
                  </form>
                )}
              </div>

              {/* Entries */}
              <div className="flex-1 overflow-x-auto">
                {ledger.entries.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400">No khata entries yet for this customer.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="text-left font-semibold px-5 py-2">Date</th>
                        <th className="text-left font-semibold px-2 py-2">Details</th>
                        <th className="text-right font-semibold px-2 py-2">Udhar</th>
                        <th className="text-right font-semibold px-2 py-2">Paid</th>
                        <th className="text-right font-semibold px-2 py-2">Balance</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.entries.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50/70 group">
                          <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {e.created_at.slice(0, 10)}
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-slate-700 max-w-[220px]">
                            <span className="line-clamp-2">{e.note || (e.entry_type === 'credit' ? 'Udhar' : 'Payment')}</span>
                            {e.source !== 'manual' && (
                              <span className="ml-0 mt-0.5 inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold uppercase">
                                {e.source === 'voice' ? '🎙 voice' : 'order'}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-right font-bold text-rose-700">
                            {e.entry_type === 'credit' ? formatINR(e.amount) : ''}
                          </td>
                          <td className="px-2 py-2.5 text-right font-bold text-emerald-700">
                            {e.entry_type === 'payment' ? formatINR(e.amount) : ''}
                          </td>
                          <td className={`px-2 py-2.5 text-right font-black ${balanceClass(e.running_balance || 0)}`}>
                            {formatINR(e.running_balance || 0)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              onClick={() => deleteEntry(e.id)}
                              title="Delete entry"
                              className="sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-red-600 cursor-pointer transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
