import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, X, Phone, MessageCircle, Mic } from 'lucide-react';
import { Customer, LanguageCode } from '../types';
import { api } from '../services/api';
import { useT } from '../utils/i18n';
import { SHOP_NAME, formatINR, openWhatsApp } from '../utils/whatsapp';

interface Props {
  customers: Customer[];
  language: LanguageCode;
  refreshKey?: number;
  onRefresh?: () => void;
  onOpenVoice: () => void;
}

export const CustomersTab: React.FC<Props> = ({ customers, language, refreshKey, onRefresh, onOpenVoice }) => {
  const tr = useT(language);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    api
      .getKhata()
      .then((k) => setBalances(Object.fromEntries(k.accounts.map((a) => [a.customer_id, a.balance]))))
      .catch(() => {});
  }, [refreshKey]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q));
  }, [customers, search]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.createCustomer({ name: name.trim(), phone: phone.trim(), business_notes: note.trim() });
      setFormOpen(false);
      setName('');
      setPhone('');
      setNote('');
      onRefresh?.();
    } finally {
      setSaving(false);
    }
  };

  const balanceText = (b: number | undefined) =>
    b == null ? '' : b > 0 ? tr('common.owes', { amt: formatINR(b) }) : b < 0 ? tr('common.advance', { amt: formatINR(b) }) : tr('common.settled');

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 h-12">
          <Search className="w-5 h-5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('common.search')} className="flex-1 bg-transparent text-base focus:outline-none" />
        </div>
        <button onClick={onOpenVoice} aria-label={tr('nav.talk')} className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center cursor-pointer">
          <Mic className="w-5 h-5" />
        </button>
        <button onClick={() => setFormOpen(!formOpen)} className="h-12 px-4 rounded-2xl bg-slate-900 text-white font-bold flex items-center gap-2 cursor-pointer">
          {formOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          <span className="hidden sm:inline">{tr('cus.new')}</span>
        </button>
      </div>

      {formOpen && (
        <form onSubmit={save} className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
          <p className="font-black text-slate-900">{tr('cus.new')}</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('cus.name')} required className="w-full h-12 px-3 rounded-xl border border-slate-300 text-base" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder={tr('cus.phone')} className="w-full h-12 px-3 rounded-xl border border-slate-300 text-base" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr('cus.note')} className="w-full h-12 px-3 rounded-xl border border-slate-300 text-base" />
          <p className="text-xs text-slate-500">{tr('common.speakInstead')}: “Naya grahak jodo, naam Kavita”</p>
          <button type="submit" disabled={saving} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-bold cursor-pointer disabled:opacity-60">
            {saving ? tr('common.saving') : tr('common.save')}
          </button>
        </form>
      )}

      {list.length === 0 && <p className="py-10 text-center text-slate-400">{tr('cus.empty')}</p>}
      <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {list.map((c) => {
          const b = balances[c.id];
          const digits = (c.phone || '').replace(/[^0-9+]/g, '');
          return (
            <div key={c.id} className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 shrink-0 rounded-2xl bg-indigo-50 text-indigo-700 font-black flex items-center justify-center">{c.name.charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 truncate">{c.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {c.phone || tr('common.noPhone')}
                  {b != null && (
                    <>
                      {' · '}
                      <span className={b > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>{balanceText(b)}</span>
                    </>
                  )}
                </p>
              </div>
              {digits && (
                <a href={`tel:${digits}`} aria-label={tr('common.call')} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </a>
              )}
              <button onClick={() => openWhatsApp(c.phone, tr('cus.hello', { name: c.name.split(' ')[0], shop: SHOP_NAME }))} aria-label={tr('common.whatsapp')} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center cursor-pointer">
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
