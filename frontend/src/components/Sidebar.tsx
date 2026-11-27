import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  BellRing, 
  Mic, 
  History, 
  Settings as SettingsIcon,
  Sparkles,
  Store
} from 'lucide-react';
import { LanguageCode } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenVoice: () => void;
  language: LanguageCode;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onSelectTab, 
  onOpenVoice,
  language 
}) => {
  const getLabels = () => {
    if (language === 'gu-IN') {
      return {
        voiceOS: 'વોઇસ ઓએસ',
        overview: 'ડેશબોર્ડ',
        orders: 'ઓર્ડર્સ',
        customers: 'ગ્રાહકો',
        reminders: 'રિમાઇન્ડર',
        history: 'વોઇસ હિસ્ટ્રી',
        settings: 'સેટિંગ્સ',
        speakBtn: 'બોલીને આદેશ આપો',
        shopName: 'નંદની ટેક્સટાઇલ્સ',
        shopCity: 'સુરત, ગુજરાત',
      };
    }
    if (language === 'hi-IN') {
      return {
        voiceOS: 'वॉइस ओएस',
        overview: 'डैशबोर्ड',
        orders: 'ऑर्डर्स',
        customers: 'ग्राहक',
        reminders: 'रिमाइंडर',
        history: 'वॉइस हिस्ट्री',
        settings: 'सेटिंग्स',
        speakBtn: 'बोलकर आदेश दें',
        shopName: 'नंदनी टेक्सटाइल्स',
        shopCity: 'सूरत, गुजरात',
      };
    }
    return {
      voiceOS: 'Voice OS',
      overview: 'Overview',
      orders: 'Orders',
      customers: 'Customers',
      reminders: 'Reminders',
      history: 'Voice History',
      settings: 'Settings',
      speakBtn: 'Speak to Assistant',
      shopName: 'Nandani Textiles',
      shopCity: 'Surat, Gujarat',
    };
  };

  const labels = getLabels();

  const navItems = [
    { id: 'voice_os', label: labels.voiceOS, icon: Mic },
    { id: 'overview', label: labels.overview, icon: LayoutDashboard },
    { id: 'orders', label: labels.orders, icon: ShoppingBag },
    { id: 'customers', label: labels.customers, icon: Users },
    { id: 'reminders', label: labels.reminders, icon: BellRing },
    { id: 'history', label: labels.history, icon: History },
    { id: 'settings', label: labels.settings, icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Mic className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                VyaparVaani
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                AI
              </span>
            </div>
            <p className="text-xs text-slate-400">Build for Bharat</p>
          </div>
        </div>
      </div>

      {/* Voice Assistant Primary Action */}
      <div className="p-4">
        <button
          onClick={onOpenVoice}
          className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:brightness-105 transition-all duration-200 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold">{labels.speakBtn}</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Business Profile */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
            <Store className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">{labels.shopName}</p>
            <p className="text-[11px] text-slate-400 truncate">{labels.shopCity}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
