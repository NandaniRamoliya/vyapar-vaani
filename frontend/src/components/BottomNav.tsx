import React, { useState } from 'react';
import { BookOpen, LayoutDashboard, Menu, Mic, ShoppingBag, Users, BellRing, History, Settings, X } from 'lucide-react';
import { LanguageCode } from '../types';
import { useT } from '../utils/i18n';

interface Props {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  language: LanguageCode;
  reminderBadge?: number;
}

/** Phone navigation: big thumb targets, Vaani in the middle, everything labelled in the chosen language. */
export const BottomNav: React.FC<Props> = ({ currentTab, onSelectTab, language, reminderBadge = 0 }) => {
  const tr = useT(language);
  const [moreOpen, setMoreOpen] = useState(false);
  const main = [
    { id: 'overview', icon: LayoutDashboard, label: tr('nav.today') },
    { id: 'khata', icon: BookOpen, label: tr('nav.khata') },
    { id: 'voice_os', icon: Mic, label: tr('nav.voice') },
    { id: 'reminders', icon: BellRing, label: tr('nav.reminders') },
  ];
  const more = [
    { id: 'orders', icon: ShoppingBag, label: tr('nav.orders') },
    { id: 'customers', icon: Users, label: tr('nav.customers') },
    { id: 'history', icon: History, label: tr('nav.history') },
    { id: 'settings', icon: Settings, label: tr('nav.settings') },
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
            {more.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => go(id)} className={`w-full h-14 px-4 rounded-2xl flex items-center gap-3 text-[15px] font-semibold cursor-pointer ${currentTab === id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}>
                <Icon className="w-5 h-5" /> {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <nav className="md:hidden shrink-0 z-50 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {main.map(({ id, icon: Icon, label }) => {
            const active = currentTab === id;
            return (
              <button key={id} onClick={() => go(id)} className={`relative flex flex-col items-center justify-center gap-0.5 cursor-pointer ${active ? 'text-indigo-700' : 'text-slate-500'}`}>
                <span className={`w-12 h-7 rounded-full flex items-center justify-center ${active ? 'bg-indigo-100' : ''}`}>
                  <Icon className="w-5 h-5" />
                </span>
                {id === 'reminders' && reminderBadge > 0 && (
                  <span className="absolute top-1.5 right-[22%] min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">{reminderBadge}</span>
                )}
                <span className="text-[11px] font-bold">{label}</span>
              </button>
            );
          })}
          <button onClick={() => setMoreOpen(!moreOpen)} className={`flex flex-col items-center justify-center gap-0.5 cursor-pointer ${moreOpen || more.some((m) => m.id === currentTab) ? 'text-indigo-700' : 'text-slate-500'}`}>
            <span className="w-12 h-7 rounded-full flex items-center justify-center">{moreOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</span>
            <span className="text-[11px] font-bold">{tr('nav.more')}</span>
          </button>
        </div>
      </nav>
    </>
  );
};
