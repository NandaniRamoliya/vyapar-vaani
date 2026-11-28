import React, { useCallback, useEffect, useState } from 'react';
import { ShoppingBag, Wallet, HandCoins, BookOpen, Phone, MessageCircle, Check, Mic, BellRing, ChevronRight } from 'lucide-react';
import { LanguageCode, TodaySummary } from '../types';
import { api } from '../services/api';
import { ago, useT, whenLabel } from '../utils/i18n';
import { formatINR, openWhatsApp, paymentReminderMessage } from '../utils/whatsapp';

interface Props {
  language: LanguageCode;
  refreshKey?: number;
  onOpenVoice: () => void;
  onSelectTab: (tab: string) => void;
  onRefresh?: () => void;
}

/** The shop at a glance, in plain words. Built for shopkeepers, not accountants. */
export const TodayTab: React.FC<Props> = ({ language, refreshKey, onOpenVoice, onSelectTab, onRefresh }) => {
  const tr = useT(language);
  const [data, setData] = useState<TodaySummary | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.getToday());
    } catch (e) {
      console.error(e);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const markDone = async (id: string) => {
    await api.toggleReminder(id);
    load();
    onRefresh?.();
  };

  if (!data) return <div className="h-64 flex items-center justify-center text-slate-400">…</div>;

  const tiles = [
    { label: tr('today.sold'), value: formatINR(data.sales_today), sub: tr('today.bills', { n: data.orders_today }), icon: ShoppingBag, tint: 'bg-indigo-50 text-indigo-600', cls: 'text-slate-900', tab: 'orders' },
    { label: tr('today.received'), value: formatINR(data.collected_today), sub: '', icon: Wallet, tint: 'bg-emerald-50 text-emerald-600', cls: 'text-emerald-600', tab: 'khata' },
    { label: tr('today.udhar'), value: formatINR(data.udhar_today), sub: '', icon: HandCoins, tint: 'bg-amber-50 text-amber-600', cls: 'text-amber-600', tab: 'khata' },
    { label: tr('today.market'), value: formatINR(data.total_outstanding), sub: tr('today.people', { n: data.customers_with_dues }), icon: BookOpen, tint: 'bg-rose-50 text-rose-600', cls: 'text-rose-600', tab: 'khata' },
  ];

  const eventText = (e: TodaySummary['recent'][number]) =>
    e.type === 'payment'
      ? tr('today.ev.payment', { name: e.customer_name, amt: formatINR(e.amount) })
      : e.type === 'udhar'
        ? tr('today.ev.udhar', { name: e.customer_name, amt: formatINR(e.amount) })
        : tr('today.ev.order', { name: e.customer_name, detail: e.detail || '', amt: formatINR(e.amount) });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg md:text-xl font-black text-slate-900">{tr('today.hello')}</p>
        <button onClick={onOpenVoice} className="hidden sm:flex shrink-0 h-11 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white font-bold items-center gap-2 cursor-pointer">
          <Mic className="w-5 h-5" /> {tr('nav.talk')}
        </button>
      </div>

      {/* Four plain numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(({ label, value, sub, icon: Icon, tint, cls, tab }) => (
          <button key={label} onClick={() => onSelectTab(tab)} className="text-left bg-white rounded-3xl border border-slate-200 p-4 md:p-5 shadow-xs hover:border-indigo-300 cursor-pointer">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tint}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-500 leading-tight">{label}</p>
            <p className={`text-2xl md:text-3xl font-black tracking-tight ${cls}`}>{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* To do today */}
        <section className="bg-white rounded-3xl border border-slate-200 p-4 md:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-amber-500" /> {tr('today.tasks')}
              {data.overdue_count > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">{tr('today.overdue', { n: data.overdue_count })}</span>}
            </h3>
            <button onClick={() => onSelectTab('reminders')} aria-label={tr('title.reminders')} className="text-slate-400 cursor-pointer">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {data.reminders.length === 0 ? (
            <p className="py-6 text-center text-slate-400">{tr('today.noTasks')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.reminders.map((r) => (
                <div key={r.id} className="py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 leading-snug">{r.title}</p>
                    <p className={`text-xs ${r.due_at && new Date(r.due_at) < new Date() ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                      {r.due_at ? whenLabel(language, r.due_at) : ''}
                      {r.balance && r.balance > 0 ? ` · ${tr('common.owes', { amt: formatINR(r.balance) })}` : ''}
                    </p>
                  </div>
                  {r.phone && (
                    <a href={`tel:${r.phone.replace(/[^0-9+]/g, '')}`} aria-label={tr('common.call')} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                  <button onClick={() => markDone(r.id)} aria-label={tr('common.done')} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center cursor-pointer">
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Collect money from */}
        <section className="bg-white rounded-3xl border border-slate-200 p-4 md:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-rose-500" /> {tr('today.collect')}
            </h3>
            <button onClick={() => onSelectTab('khata')} aria-label={tr('title.khata')} className="text-slate-400 cursor-pointer">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {data.top_dues.map((a) => (
              <div key={a.customer_id} className="py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{a.customer_name}</p>
                  {a.days_since_payment != null && (
                    <p className={`text-xs ${a.days_since_payment > 30 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                      {a.never_paid ? tr('common.unpaidDays', { n: a.days_since_payment }) : a.days_since_payment === 0 ? tr('common.paidToday') : tr('common.daysSincePay', { n: a.days_since_payment })}
                    </p>
                  )}
                </div>
                <p className="font-black text-rose-600">{formatINR(a.balance)}</p>
                <button onClick={() => openWhatsApp(a.phone, paymentReminderMessage(a.customer_name, a.balance, language))} aria-label={tr('common.whatsapp')} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center cursor-pointer">
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* What happened, as sentences */}
      <section className="bg-white rounded-3xl border border-slate-200 p-4 md:p-5 shadow-xs">
        <h3 className="font-black text-slate-900 mb-2">{tr('today.recent')}</h3>
        <div className="divide-y divide-slate-100">
          {data.recent.map((e, i) => (
            <div key={i} className="py-2.5 flex items-center justify-between gap-3">
              <p className="text-slate-800">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${e.type === 'payment' ? 'bg-emerald-500' : e.type === 'udhar' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                {eventText(e)}
              </p>
              <span className="text-xs text-slate-400 shrink-0">{ago(language, e.created_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
