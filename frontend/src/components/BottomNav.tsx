import React, { useState } from 'react';
import { BookOpen, LayoutDashboard, Menu, Mic, ShoppingBag, Users, BellRing, History, Settings, X } from 'lucide-react';
import { LanguageCode } from '../types';

interface Props {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  language: LanguageCode;
}

const LABELS: Record<LanguageCode, Record<string, string>> = {
  'en-IN': { voice_os: 'Bolo', khata: 'Khata', orders: 'Orders', overview: 'Dashboard', more: 'More', customers: 'Customers', reminders: 'Reminders', history: 'Voice log', settings: 'Settings' },
  'hi-IN': { voice_os: 'बोलो', khata: 'खाता', orders: 'ऑर्डर', overview: 'डैशबोर्ड', more: 'और', customers: 'ग्राहक', reminders: 'रिमाइंडर', history: 'वॉइस लॉग', settings: 'सेटिंग्स' },
  'gu-IN': { voice_os: 'બોલો', khata: 'ખાતું', orders: 'ઓર્ડર', overview: 'ડેશબોર્ડ', more: 'વધુ', customers: 'ગ્રાહકો', reminders: 'રિમાઇન્ડર', history: 'વોઇસ લોગ', settings: 'સેટિંગ્સ' },
};

/** Phone navigation: big thumb targets, the voice agent in the middle. */
export const BottomNav: React.FC<Props> = ({ currentTab, onSelectTab, language }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const t = LABELS[language];
  const main = [
    { id: 'khata', icon: BookOpen },
    { id: 'orders', icon: ShoppingBag },
    { id: 'voice_os', icon: Mic },
    { id: 'overview', icon: LayoutDashboard },
  ];
  const more = [
    { id: 'customers', icon: Users },
    { id: 'reminders', icon: BellRing },
    { id: 'history', icon: History },
    { id: 'settings', icon: Settings },
  ];
  const go = (id: string) => {
    setMoreOpen(false);
    onSelectTab(id);
  };

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-3 rounded-3xl bg-white p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {more.map(({ id, icon: Icon }) => (
              <button key={id} onClick={() => go(id)} className={`w-full h-14 px-4 rounded-2xl flex items-center gap-3 text-[15px] font-semibold cursor-pointer ${currentTab === id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}>
                <Icon className="w-5 h-5" /> {t[id]}
              </button>
            ))}
          </div>
        </div>
      )}
      <nav className="md:hidden shrink-0 z-50 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {main.map(({ id, icon: Icon }) => {
            const active = currentTab === id;
            return (
              <button key={id} onClick={() => go(id)} className={`flex flex-col items-center justify-center gap-0.5 cursor-pointer ${active ? 'text-indigo-700' : 'text-slate-500'}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold">{t[id]}</span>
              </button>
            );
          })}
          <button onClick={() => setMoreOpen(!moreOpen)} className={`flex flex-col items-center justify-center gap-0.5 cursor-pointer ${moreOpen || more.some((m) => m.id === currentTab) ? 'text-indigo-700' : 'text-slate-500'}`}>
            {moreOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-[10px] font-bold">{t.more}</span>
          </button>
        </div>
      </nav>
    </>
  );
};
