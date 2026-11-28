import React from 'react';
import { Mic, ShieldCheck } from 'lucide-react';
import { LanguageCode } from '../types';
import { LANGS, LANG_ORDER } from '../utils/lang';
import { I18nKey, useT } from '../utils/i18n';

interface HeaderProps {
  currentTab: string;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onOpenVoice: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  language,
  onLanguageChange,
  onOpenVoice,
}) => {
  const tr = useT(language);
  const key = ({ voice_os: 'voice', overview: 'today' } as Record<string, string>)[currentTab] || currentTab;
  const getTitles = () => ({
    title: tr(`title.${key}` as I18nKey),
    subtitle: tr(`sub.${key}` as I18nKey),
  });

  const { title, subtitle } = getTitles();

  return (
    <header className="h-14 md:h-18 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between gap-3 shrink-0">
      <div className="min-w-0">
        <h1 className="text-base md:text-xl font-bold text-slate-900 tracking-tight truncate">{title}</h1>
        <p className="hidden md:block text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>No keys · your data stays with you</span>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-0.5" role="group" aria-label="Language">
          {LANG_ORDER.map((code) => (
            <button
              key={code}
              onClick={() => onLanguageChange(code)}
              aria-pressed={language === code}
              className={`min-w-9 h-8 px-2 rounded-lg text-xs font-bold cursor-pointer ${
                language === code ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {LANGS[code].short}
            </button>
          ))}
        </div>

        {currentTab !== 'voice_os' && (
          <button
            onClick={onOpenVoice}
            className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Mic className="w-4 h-4" />
            <span>{tr('nav.talk')}</span>
          </button>
        )}
      </div>
    </header>
  );
};
