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
  X,
  ChevronLeft,
  ShieldCheck,
  ShieldAlert,
  Share2,
} from 'lucide-react';
import { ChainCheck, CustomerLedger, KhataSummary, LanguageCode, LedgerEntryType } from '../types';
import { api } from '../services/api';
import { formatINR, openWhatsApp, paymentReminderMessage, shareVoiceProof } from '../utils/whatsapp';
import { useT } from '../utils/i18n';
import { ProofPlayer } from './ProofPlayer';

interface KhataTabProps {
  onOpenVoice: () => void;
  onRefresh?: () => void;
  refreshKey?: number;
  language?: LanguageCode;
}

type Filter = 'dues' | 'all' | 'settled';

const balanceClass = (b: number) => (b > 0 ? 'text-rose-600' : b < 0 ? 'text-sky-600' : 'text-emerald-600');


export const KhataTab: React.FC<KhataTabProps> = ({ onOpenVoice, onRefresh, refreshKey, language = 'en-IN' }) => {
  const tr = useT(language);
  const balanceLabel = (b: number) => (b > 0 ? tr('common.owes', { amt: '' }).trim() : b < 0 ? tr('common.advance', { amt: '' }).trim() : tr('common.settled'));
  const dueAgeLabel = (days: number, neverPaid?: boolean) =>
    neverPaid ? tr('common.unpaidDays', { n: days }) : days === 0 ? tr('common.paidToday') : tr('common.daysSincePay', { n: days });
  const [summary, setSummary] = useState<KhataSummary | null>(null);
  const [chain, setChain] = useState<ChainCheck | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false); // phones: list -> detail
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
      const [data, check] = await Promise.all([api.getKhata(), api.verifySignatures().catch(() => null)]);
      setSummary(data);
      setChain(check);
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
      setFormError(tr('kh.amountErr'));
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
    if (!selectedId || !window.confirm(tr('kh.confirmDelete'))) return;
    try {
      await api.deleteKhataEntry(entryId);
      await Promise.all([loadSummary(), loadLedger(selectedId)]);
      onRefresh?.();
    } catch (err: any) {
      window.alert(err?.message || 'Could not delete entry');
    }
  };

  const selected = summary?.accounts.find((a) => a.customer_id === selectedId) || null;
  const signedCount = chain?.checked ?? 0;

  return (
    <div className="space-y-4 md:space-y-5 max-w-6xl mx-auto">
      {/* Headline numbers */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {[
          { label: tr('kh.outstanding'), value: formatINR(summary?.total_outstanding || 0), cls: 'text-rose-600', icon: IndianRupee, tint: 'bg-rose-50 text-rose-600' },
          { label: tr('kh.withDues'), value: String(summary?.customers_with_dues ?? 0), cls: 'text-slate-900', icon: Users, tint: 'bg-amber-50 text-amber-600' },
          { label: tr('kh.collectedMonth'), value: formatINR(summary?.collected_this_month || 0), cls: 'text-emerald-600', icon: Wallet, tint: 'bg-emerald-50 text-emerald-600' },
        ].map(({ label, value, cls, icon: Icon, tint }) => (
          <div key={label} className="bg-white p-3 md:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">{label}</span>
              <div className={`hidden md:flex w-9 h-9 rounded-xl items-center justify-center ${tint}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className={`mt-1 md:mt-3 text-lg md:text-2xl font-black tracking-tight ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Voice signature integrity */}
      {chain && (chain.checked > 0 || !chain.valid) && (
        <div
          className={`rounded-2xl px-4 py-3 flex items-center gap-3 border ${
            chain.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {chain.valid ? <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />}
          <p className="text-xs flex-1">
            {chain.valid ? (
              <>
                <b>{tr('kh.chainOk', { n: signedCount })}</b>
              </>
            ) : (
              <>
                <b>{tr('kh.chainBad', { name: chain.customer_name || '' })}</b> ({chain.problems?.join(', ')})
              </>
            )}
          </p>
          <button
            onClick={onOpenVoice}
            className="shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" /> {tr('nav.talk')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
        {/* Account list */}
        <div className={`lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex-col min-h-[420px] ${showDetail ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 md:p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-11">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={tr('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-800 focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5">
              {(['dues', 'all', 'settled'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`h-8 px-3 rounded-lg text-xs font-bold cursor-pointer ${
                    filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'dues' ? tr('kh.filterDues') : f === 'all' ? tr('common.all') : tr('kh.filterSettled')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {accounts.length === 0 && <p className="p-6 text-center text-xs text-slate-400">{tr('kh.noMatch')}</p>}
            {accounts.map((a) => (
              <button
                key={a.customer_id}
                onClick={() => {
                  setSelectedId(a.customer_id);
                  setFormType(null);
                  setShowDetail(true);
                }}
                className={`w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  a.customer_id === selectedId ? 'lg:bg-indigo-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-slate-900 truncate">{a.customer_name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {a.days_since_payment != null ? (
                      <span className={a.days_since_payment > 30 ? 'text-rose-600 font-semibold' : ''}>
                        {dueAgeLabel(a.days_since_payment, a.never_paid)}
                      </span>
                    ) : (
                      a.phone || tr('common.noPhone')
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[15px] font-black ${balanceClass(a.balance)}`}>{formatINR(a.balance)}</p>
                  <p className="text-[10px] text-slate-400">{balanceLabel(a.balance)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ledger detail */}
        <div className={`lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex-col min-h-[420px] ${showDetail ? 'flex' : 'hidden lg:flex'}`}>
          {!selected || !ledger ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs p-8">
              <BookOpen className="w-8 h-8 mb-2" />
              {tr('kh.pick')}
            </div>
          ) : (
            <>
              <div className="p-4 md:p-5 border-b border-slate-100">
                <button onClick={() => setShowDetail(false)} className="lg:hidden -ml-1 mb-2 h-9 pr-3 flex items-center gap-1 text-sm font-semibold text-indigo-700 cursor-pointer">
                  <ChevronLeft className="w-5 h-5" /> {tr('kh.back')}
                </button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-900 truncate">{selected.customer_name}</h3>
                    <p className="text-xs text-slate-500">{selected.phone || tr('common.noPhone')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{balanceLabel(ledger.balance)}</p>
                    <p className={`text-3xl font-black tracking-tight ${balanceClass(ledger.balance)}`}>{formatINR(ledger.balance)}</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-[11px] text-slate-500">
                  <span>{tr('kh.totalUdhar')}: <b className="text-slate-800">{formatINR(ledger.total_credit)}</b></span>
                  <span>{tr('kh.totalPaid')}: <b className="text-slate-800">{formatINR(ledger.total_paid)}</b></span>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  <button onClick={() => openForm('credit')} className="h-11 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer">
                    <Plus className="w-4 h-4" /> {tr('kh.gave')}
                  </button>
                  <button onClick={() => openForm('payment')} className="h-11 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                    <Minus className="w-4 h-4" /> {tr('kh.got')}
                  </button>
                  {ledger.balance > 0 && (
                    <button
                      onClick={() => openWhatsApp(selected.phone, paymentReminderMessage(selected.customer_name, ledger.balance, language))}
                      className="col-span-2 sm:col-span-1 h-11 flex items-center justify-center gap-1.5 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" /> {tr('kh.remind')}
                    </button>
                  )}
                </div>

                {formType && (
                  <form onSubmit={submitEntry} className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${formType === 'credit' ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {formType === 'credit' ? tr('kh.newUdhar') : tr('kh.newPayment')}
                      </span>
                      <button type="button" onClick={() => setFormType(null)} aria-label="Close" className="text-slate-400 hover:text-slate-700 cursor-pointer">
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
                        placeholder={tr('kh.amount')}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="sm:w-36 h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder={tr('kh.note')}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="flex-1 h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <button type="submit" disabled={saving} className="h-11 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold cursor-pointer disabled:opacity-60">
                        {saving ? tr('common.saving') : tr('common.save')}
                      </button>
                    </div>
                    {formError && <p className="text-[11px] text-rose-600">{formError}</p>}
                  </form>
                )}
              </div>

              {/* Entries, newest first */}
              <div className="flex-1 divide-y divide-slate-100">
                {ledger.entries.length === 0 && <p className="p-6 text-center text-xs text-slate-400">{tr('kh.noEntries')}</p>}
                {ledger.entries.map((e) => (
                  <div key={e.id} className="px-4 md:px-5 py-3 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 line-clamp-2">{e.note || (e.entry_type === 'credit' ? tr('kh.gave') : tr('kh.got'))}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5">
                          {e.created_at.slice(0, 16)}
                          {e.source !== 'manual' && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold uppercase">
                              {e.source === 'voice' ? `🎙 ${tr('kh.byVoice')}` : tr('kh.fromBill')}
                            </span>
                          )}
                          {e.signature && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" /> {tr('kh.signed')}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black ${e.entry_type === 'credit' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {e.entry_type === 'credit' ? '+' : '−'}
                          {formatINR(e.amount)}
                        </p>
                        <p className="text-[10px] text-slate-400">{tr('kh.bal', { amt: formatINR(e.running_balance || 0) })}</p>
                      </div>
                      {!e.signature && (
                        <button
                          onClick={() => deleteEntry(e.id)}
                          aria-label="Delete entry"
                          className="shrink-0 w-8 h-8 -mr-2 flex items-center justify-center lg:opacity-0 lg:group-hover:opacity-100 text-slate-300 hover:text-red-600 cursor-pointer transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {e.signature && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <ProofPlayer signature={e.signature} compact />
                        </div>
                        <button
                          onClick={() =>
                            shareVoiceProof({
                              audioUrl: e.signature!.audio_url,
                              customerName: selected.customer_name,
                              phone: selected.phone,
                              amount: e.amount,
                              date: e.created_at.slice(0, 10),
                              lang: language,
                            })
                          }
                          aria-label={tr('kh.shareProof')}
                          className="shrink-0 w-10 h-10 rounded-xl border border-emerald-200 text-emerald-700 flex items-center justify-center cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
