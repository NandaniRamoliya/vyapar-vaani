import React from 'react';
import { Globe, Mic, CheckCircle2, ShieldCheck } from 'lucide-react';
import { LanguageCode } from '../types';

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
  const getTitles = () => {
    switch (currentTab) {
      case 'orders':
        return { title: 'Orders Management', subtitle: 'Real-time order entries created via voice commands' };
      case 'customers':
        return { title: 'Customers & Inquiries', subtitle: 'Directory of clients, phone numbers, and past history' };
      case 'reminders':
        return { title: 'Reminders & Follow-ups', subtitle: 'Scheduled reminders and pending business tasks' };
      case 'history':
        return { title: 'Voice Interaction Audit', subtitle: 'Logged speech transcripts and execution status' };
      case 'settings':
        return { title: 'Settings & Model Config', subtitle: 'Application preferences, mock fallback mode, and API status' };
      default:
        return { title: 'Business Overview', subtitle: 'Live sales metrics, active orders, and voice assistant' };
    }
  };

  const { title, subtitle } = getTitles();

  return (
    <header className="h-18 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center space-x-3">
        {/* Zero-Key / Mock Mode indicator */}
        <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero-Key Offline AI Ready</span>
        </div>

        {/* Language Selector */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => onLanguageChange('en-IN')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              language === 'en-IN'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            onClick={() => onLanguageChange('hi-IN')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              language === 'hi-IN'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            हिन्दी
          </button>
          <button
            onClick={() => onLanguageChange('gu-IN')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              language === 'gu-IN'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ગુજરાતી
          </button>
        </div>

        {/* Quick Voice Mic Button */}
        <button
          onClick={onOpenVoice}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <Mic className="w-4 h-4" />
          <span>Voice Command</span>
        </button>
      </div>
    </header>
  );
};
