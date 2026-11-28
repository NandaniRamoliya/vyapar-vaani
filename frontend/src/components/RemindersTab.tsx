import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, Phone, MessageCircle, Check, Clock, Trash2, Plus, Mic, HandCoins, Bell, X, RotateCcw } from 'lucide-react';
import { Customer, LanguageCode, Reminder } from '../types';
import { api } from '../services/api';
import { localNowISO, useT, whenLabel } from '../utils/i18n';
import { askNotificationPermission } from '../utils/speech';
import { formatINR, openWhatsApp, paymentReminderMessage } from '../utils/whatsapp';

interface Props {
  reminders: Reminder[];
  customers: Customer[];
  language: LanguageCode;
  onRefresh?: () => void;
  onOpenVoice: () => void;
}

const kindIcon = (k?: string) => (k === 'payment' ? HandCoins : k === 'call' ? Phone : Bell);

export const RemindersTab: React.FC<Props> = ({ reminders, customers, language, onRefresh, onOpenVoice }) => {
  const tr = useT(language);
  const [perm, setPerm] = useState<string>(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const [formOpen, setFormOpen] = useState(false);
  const [what, setWhat] = useState('');
  const [when, setWhen] = useState('');
  const [who, setWho] = useState('');
  const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0);

  // keep "late" labels fresh
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const groups = useMemo(() => {
    const now = new Date();
    const pending = reminders.filter((r) => r.status === 'pending');
    const due = (r: Reminder) => new Date(r.due_at || `${r.reminder_date}T10:00:00`);
    return {
      late: pending.filter((r) => due(r) < now),
      upcoming: pending.filter((r) => due(r) >= now),
      done: reminders.filter((r) => r.status === 'completed').slice(0, 10),
    };
  }, [reminders]);

  const preset = (kind: 'in10' | 'in1h' | 'eve' | 'tom') => {
    const d = new Date();
    if (kind === 'in10') d.setMinutes(d.getMinutes() + 10);
    if (kind === 'in1h') d.setHours(d.getHours() + 1);
    if (kind === 'eve') d.setHours(18, 0, 0, 0);
    if (kind === 'tom') {
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
    }
    setWhen(localNowISO(d).slice(0, 16));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!what.trim() || !when) return;
    setSaving(true);
    try {
      const d = new Date(when);
      const cust = customers.find((c) => c.id === who);
      await api.createReminder({
        title: what.trim(),
        reminder_date: localNowISO(d).slice(0, 10),
        // "05:30 PM" built by hand: toLocaleTimeString may insert a narrow no-break space the server can't parse
        reminder_time: `${String(d.getHours() % 12 || 12).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`,
        customer_id: cust?.id,
        customer_name: cust?.name,
      } as Partial<Reminder>);
      setFormOpen(false);
      setWhat('');
      setWhen('');
      setWho('');
      onRefresh?.();
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    await fn().catch(() => {});
    onRefresh?.();
  };

  const card = (r: Reminder, tone: 'late' | 'upcoming' | 'done') => {
    const Icon = kindIcon(r.kind);
    return (
      <div key={r.id} className={`bg-white rounded-3xl border p-4 shadow-xs ${tone === 'late' ? 'border-rose-300' : 'border-slate-200'} ${tone === 'done' ? 'opacity-60' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center ${tone === 'late' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-bold text-slate-900 leading-snug ${tone === 'done' ? 'line-through' : ''}`}>{r.title}</p>
            <p className={`text-sm ${tone === 'late' ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
              {r.due_at ? whenLabel(language, r.due_at) : `${r.reminder_date} ${r.reminder_time}`}
              {r.customer_name ? ` · ${r.customer_name}` : ''}
              {r.balance && r.balance > 0 ? ` · ${tr('common.owes', { amt: formatINR(r.balance) })}` : ''}
            </p>
          </div>
          <button onClick={() => window.confirm(`${tr('common.delete')}?`) && act(() => api.deleteReminder(r.id))} aria-label={tr('common.delete')} className="w-9 h-9 -mr-1 rounded-xl text-slate-300 hover:text-rose-600 flex items-center justify-center cursor-pointer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {tone !== 'done' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {r.phone && (
              <a href={`tel:${r.phone.replace(/[^0-9+]/g, '')}`} className="h-10 px-3 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center gap-1.5">
                <Phone className="w-4 h-4" /> {tr('common.call')}
              </a>
            )}
            {r.customer_name && (
              <button onClick={() => openWhatsApp(r.phone, r.balance && r.balance > 0 ? paymentReminderMessage(r.customer_name!, r.balance, language) : r.title)} className="h-10 px-3 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                <MessageCircle className="w-4 h-4" /> {tr('common.whatsapp')}
              </button>
            )}
            <button onClick={() => act(() => api.toggleReminder(r.id))} className="h-10 px-3 rounded-xl border-2 border-emerald-500 text-emerald-700 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
              <Check className="w-4 h-4" /> {tr('common.done')}
            </button>
            <button onClick={() => act(() => api.snoozeReminder(r.id, 10))} className="h-10 px-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
              <Clock className="w-4 h-4" /> {tr('rem.snooze')}
            </button>
          </div>
        ) : (
          <button onClick={() => act(() => api.toggleReminder(r.id))} className="mt-2 h-9 px-3 rounded-xl text-slate-500 text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
            <RotateCcw className="w-4 h-4" /> {tr('rem.reopen')}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Alerts permission, in plain words */}
      {perm !== 'granted' ? (
        <div className="rounded-3xl bg-amber-50 border border-amber-200 p-4">
          <p className="font-black text-amber-950 flex items-center gap-2">
            <BellRing className="w-5 h-5" /> {tr('rem.allowTitle')}
          </p>
          <p className="mt-1 text-sm text-amber-900">{perm === 'denied' ? tr('rem.alertsBlocked') : tr('rem.allowText')}</p>
          {perm === 'default' && (
            <button onClick={async () => setPerm(await askNotificationPermission())} className="mt-3 h-11 px-4 rounded-2xl bg-amber-500 text-white font-bold cursor-pointer">
              {tr('rem.allowBtn')}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-emerald-700 font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" /> {tr('rem.alertsOn')}
        </p>
      )}

      {/* Speak or add */}
      <div className="rounded-3xl bg-indigo-50 border border-indigo-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-sm text-indigo-950">{tr('rem.voiceHint')}</p>
        <div className="flex gap-2 shrink-0">
          <button onClick={onOpenVoice} className="h-11 px-4 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 cursor-pointer">
            <Mic className="w-4 h-4" /> {tr('nav.talk')}
          </button>
          <button onClick={() => setFormOpen(!formOpen)} aria-label={tr('rem.new')} className="h-11 w-11 rounded-2xl bg-white border border-indigo-200 text-indigo-700 flex items-center justify-center cursor-pointer">
            {formOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {formOpen && (
        <form onSubmit={save} className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
          <p className="font-black text-slate-900">{tr('rem.new')}</p>
          <label className="block text-sm font-semibold text-slate-600">
            {tr('rem.what')}
            <input value={what} onChange={(e) => setWhat(e.target.value)} placeholder={tr('rem.whatPh')} required className="mt-1 w-full h-12 px-3 rounded-xl border border-slate-300 text-base focus:outline-none focus:border-indigo-500" />
          </label>
          <div>
            <p className="text-sm font-semibold text-slate-600">{tr('rem.when')}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {(['in10', 'in1h', 'eve', 'tom'] as const).map((k) => (
                <button key={k} type="button" onClick={() => preset(k)} className="h-10 px-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer">
                  {tr(`rem.${k}`)}
                </button>
              ))}
            </div>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required className="mt-2 w-full h-12 px-3 rounded-xl border border-slate-300 text-base focus:outline-none focus:border-indigo-500" />
          </div>
          <label className="block text-sm font-semibold text-slate-600">
            {tr('rem.who')}
            <select value={who} onChange={(e) => setWho(e.target.value)} className="mt-1 w-full h-12 px-3 rounded-xl border border-slate-300 bg-white text-base">
              <option value="">{tr('rem.none')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={saving} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-bold cursor-pointer disabled:opacity-60">
            {saving ? tr('common.saving') : tr('common.save')}
          </button>
        </form>
      )}

      {groups.late.length + groups.upcoming.length + groups.done.length === 0 && <p className="py-10 text-center text-slate-400">{tr('rem.empty')}</p>}
      {groups.late.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-black text-rose-600 uppercase tracking-wide">{tr('rem.late')}</h3>
          {groups.late.map((r) => card(r, 'late'))}
        </section>
      )}
      {groups.upcoming.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-wide">{tr('rem.upcoming')}</h3>
          {groups.upcoming.map((r) => card(r, 'upcoming'))}
        </section>
      )}
      {groups.done.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-wide">{tr('rem.finished')}</h3>
          {groups.done.map((r) => card(r, 'done'))}
        </section>
      )}
    </div>
  );
};
