import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Phone, MessageCircle, Check, Clock, X } from 'lucide-react';
import { LanguageCode, Reminder } from '../types';
import { api } from '../services/api';
import { t, whenLabel } from '../utils/i18n';
import { playSoundboxChime } from '../utils/soundboxChime';
import { notify, speakText } from '../utils/speech';
import { formatINR, openWhatsApp, paymentReminderMessage } from '../utils/whatsapp';

interface Props {
  language: LanguageCode;
  onChanged?: () => void;
}

const POLL_MS = 20000;

/**
 * Watches for reminders whose time has come, on every screen. When one is due it
 * rings (soundbox chime), vibrates, speaks it aloud, shows a phone notification,
 * and offers one-tap Call / WhatsApp / Done / 10 min later.
 */
export const ReminderAlerts: React.FC<Props> = ({ language, onChanged }) => {
  const [queue, setQueue] = useState<Reminder[]>([]);
  const alerted = useRef<Set<string>>(new Set()); // id@due_at already announced
  const langRef = useRef(language);
  useEffect(() => {
    langRef.current = language;
  }, [language]);

  const check = useCallback(async () => {
    try {
      const due = await api.getDueReminders();
      const fresh = due.filter((r) => !alerted.current.has(`${r.id}@${r.due_at}`));
      if (!fresh.length) return;
      fresh.forEach((r) => alerted.current.add(`${r.id}@${r.due_at}`));
      setQueue((q) => [...q.filter((x) => !fresh.some((f) => f.id === x.id)), ...fresh]);

      const lang = langRef.current;
      const first = fresh[0];
      playSoundboxChime();
      setTimeout(playSoundboxChime, 700);
      navigator.vibrate?.([300, 150, 300, 150, 300]);
      speakText(t(lang, 'rem.speak', { title: first.title }), lang);
      for (const r of fresh) {
        const who = r.customer_name ? ` · ${r.customer_name}` : '';
        notify(`🔔 ${t(lang, 'rem.timeUp')}`, `${r.title}${who}`, r.id);
      }
    } catch (_e) {
      /* server not reachable right now; try again next round */
    }
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  const close = (id: string) => setQueue((q) => q.filter((r) => r.id !== id));
  const done = async (r: Reminder) => {
    close(r.id);
    await api.toggleReminder(r.id).catch(() => {});
    onChanged?.();
  };
  const later = async (r: Reminder) => {
    close(r.id);
    await api.snoozeReminder(r.id, 10).catch(() => {});
    onChanged?.();
  };

  if (!queue.length) return null;
  const r = queue[0];
  const L = (k: Parameters<typeof t>[1], v?: Record<string, string | number>) => t(language, k, v);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] p-3 md:p-4 flex justify-center pointer-events-none" role="alertdialog" aria-live="assertive">
      <div className="pointer-events-auto w-full max-w-md rounded-3xl bg-white shadow-2xl border-2 border-amber-300 overflow-hidden animate-in slide-in-from-top">
        <div className="bg-amber-400 px-4 py-2 flex items-center justify-between">
          <span className="flex items-center gap-2 font-black text-amber-950">
            <BellRing className="w-5 h-5 animate-bounce" /> {L('rem.timeUp')}
            {queue.length > 1 && <span className="text-xs font-bold bg-amber-950/10 rounded-full px-2">+{queue.length - 1}</span>}
          </span>
          <button onClick={() => close(r.id)} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center text-amber-950 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-lg font-black text-slate-900 leading-snug">{r.title}</p>
          <p className="mt-1 text-sm text-slate-500">
            {r.due_at ? whenLabel(language, r.due_at) : ''}
            {r.customer_name ? ` · ${r.customer_name}` : ''}
            {r.balance && r.balance > 0 ? ` · ${L('common.owes', { amt: formatINR(r.balance) })}` : ''}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {r.phone ? (
              <a href={`tel:${r.phone.replace(/[^0-9+]/g, '')}`} className="h-12 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-2">
                <Phone className="w-5 h-5" /> {L('common.call')}
              </a>
            ) : (
              <span />
            )}
            {r.customer_name ? (
              <button
                onClick={() => openWhatsApp(r.phone, r.balance && r.balance > 0 ? paymentReminderMessage(r.customer_name!, r.balance, language) : r.title)}
                className="h-12 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" /> {L('common.whatsapp')}
              </button>
            ) : (
              <span />
            )}
            <button onClick={() => done(r)} className="h-12 rounded-2xl border-2 border-emerald-500 text-emerald-700 font-bold flex items-center justify-center gap-2 cursor-pointer">
              <Check className="w-5 h-5" /> {L('common.done')}
            </button>
            <button onClick={() => later(r)} className="h-12 rounded-2xl border border-slate-300 text-slate-700 font-bold flex items-center justify-center gap-2 cursor-pointer">
              <Clock className="w-5 h-5" /> {L('rem.snooze')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
