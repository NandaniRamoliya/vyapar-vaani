import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { TodayTab } from './components/TodayTab';
import { ReminderAlerts } from './components/ReminderAlerts';
import { OrdersTab } from './components/OrdersTab';
import { CustomersTab } from './components/CustomersTab';
import { RemindersTab } from './components/RemindersTab';
import { VoiceHistoryTab } from './components/VoiceHistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { VoiceAgent } from './components/VoiceAgent';
import { KhataTab } from './components/KhataTab';
import { Order, Customer, Reminder, VoiceInteraction, LanguageCode } from './types';
import { api } from './services/api';
import { loadLanguage, saveLanguage } from './utils/lang';
import { LoginScreen } from './components/LoginScreen';
import { AdminApp } from './components/AdminApp';
import { Session, getSession, onSessionChange } from './services/auth';
import { setShopName } from './utils/whatsapp';

/** Login gate: no session -> login screen; admin -> admin console; shopkeeper -> their own shop. */
export function App() {
  const [session, setSessionState] = useState<Session | null>(getSession);
  const [language, setLanguageState] = useState<LanguageCode>(loadLanguage);
  useEffect(() => onSessionChange(setSessionState), []);
  // Before rendering anything that shows or sends the shop name (bills, reminders, Vaani's header)
  setShopName(session?.shop?.name);
  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    saveLanguage(lang);
  };

  if (!session) return <LoginScreen language={language} onLanguageChange={setLanguage} />;
  if (session.user.role === 'admin') return <AdminApp />;
  return <ShopApp key={session.shop?.id} language={language} setLanguage={setLanguage} />;
}

function ShopApp({ language, setLanguage }: { language: LanguageCode; setLanguage: (l: LanguageCode) => void }) {
  const [currentTab, setCurrentTab] = useState('voice_os');

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [history, setHistory] = useState<VoiceInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumped on every data reload so the Khata tab re-fetches its own ledger data
  const [refreshKey, setRefreshKey] = useState(0);

  const loadAllData = useCallback(async () => {
    try {
      const [ordersData, customersData, remindersData, historyData] = await Promise.all([
        api.getOrders().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getReminders().catch(() => []),
        api.getVoiceHistory().catch(() => []),
      ]);
      setOrders(ordersData);
      setCustomers(customersData);
      setReminders(remindersData);
      setHistory(historyData);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const openVoice = () => setCurrentTab('voice_os');
  const lateReminders = reminders.filter((r) => r.status === 'pending' && r.due_at && new Date(r.due_at) < new Date()).length;
  const isVoice = currentTab === 'voice_os';

  return (
    <div className="flex h-[100dvh] bg-slate-100 font-sans antialiased overflow-hidden selection:bg-indigo-500 selection:text-white">
      <div className="hidden md:flex">
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} onOpenVoice={openVoice} language={language} />
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <div className={isVoice ? 'hidden md:block' : ''}>
          <Header currentTab={currentTab} language={language} onLanguageChange={setLanguage} onOpenVoice={openVoice} />
        </div>

        {/* The voice agent manages its own scroll area; the back-office tabs scroll as pages */}
        <main className={isVoice ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1 min-h-0 overflow-y-auto p-4 md:p-8'}>
          {isVoice ? (
            <VoiceAgent
              language={language}
              onLanguageChange={setLanguage}
              onRefreshData={loadAllData}
              onOpenKhata={() => setCurrentTab('khata')}
            />
          ) : loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading VyaparVaani workspace...</div>
          ) : (
            <>
              {currentTab === 'overview' && (
                <TodayTab language={language} refreshKey={refreshKey} onOpenVoice={openVoice} onSelectTab={setCurrentTab} onRefresh={loadAllData} />
              )}
              {currentTab === 'orders' && <OrdersTab orders={orders} language={language} onRefresh={loadAllData} onOpenVoice={openVoice} />}
              {currentTab === 'customers' && (
                <CustomersTab customers={customers} language={language} refreshKey={refreshKey} onRefresh={loadAllData} onOpenVoice={openVoice} />
              )}
              {currentTab === 'khata' && <KhataTab onOpenVoice={openVoice} onRefresh={loadAllData} refreshKey={refreshKey} language={language} />}
              {currentTab === 'reminders' && (
                <RemindersTab reminders={reminders} customers={customers} language={language} onRefresh={loadAllData} onOpenVoice={openVoice} />
              )}
              {currentTab === 'history' && <VoiceHistoryTab history={history} language={language} onOpenVoice={openVoice} />}
              {currentTab === 'settings' && <SettingsTab language={language} onLanguageChange={setLanguage} />}
            </>
          )}
        </main>

        <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} language={language} reminderBadge={lateReminders} />
      </div>

      {/* Rings, speaks and notifies when a reminder is due, on every screen */}
      <ReminderAlerts language={language} onChanged={loadAllData} />
    </div>
  );
}

export default App;
