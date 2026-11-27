import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardTab } from './components/DashboardTab';
import { OrdersTab } from './components/OrdersTab';
import { CustomersTab } from './components/CustomersTab';
import { RemindersTab } from './components/RemindersTab';
import { VoiceHistoryTab } from './components/VoiceHistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { VoiceAgent } from './components/VoiceAgent';
import { KhataTab } from './components/KhataTab';
import { DashboardStats, Order, Customer, Reminder, VoiceInteraction, LanguageCode } from './types';
import { api } from './services/api';
import { loadLanguage, saveLanguage } from './utils/lang';

export function App() {
  const [currentTab, setCurrentTab] = useState('voice_os');
  const [language, setLanguageState] = useState<LanguageCode>(loadLanguage);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [history, setHistory] = useState<VoiceInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumped on every data reload so the Khata tab re-fetches its own ledger data
  const [refreshKey, setRefreshKey] = useState(0);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    saveLanguage(lang);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [statsData, ordersData, customersData, remindersData, historyData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getOrders().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getReminders().catch(() => []),
        api.getVoiceHistory().catch(() => []),
      ]);
      if (statsData) setStats(statsData);
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
                <DashboardTab stats={stats} orders={orders} onOpenVoice={openVoice} onSelectTab={setCurrentTab} language={language} />
              )}
              {currentTab === 'orders' && <OrdersTab orders={orders} onRefresh={loadAllData} onOpenVoice={openVoice} />}
              {currentTab === 'customers' && <CustomersTab customers={customers} onRefresh={loadAllData} onOpenVoice={openVoice} />}
              {currentTab === 'khata' && <KhataTab onOpenVoice={openVoice} onRefresh={loadAllData} refreshKey={refreshKey} language={language} />}
              {currentTab === 'reminders' && <RemindersTab reminders={reminders} onRefresh={loadAllData} onOpenVoice={openVoice} />}
              {currentTab === 'history' && <VoiceHistoryTab history={history} onOpenVoice={openVoice} />}
              {currentTab === 'settings' && <SettingsTab />}
            </>
          )}
        </main>

        <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} language={language} />
      </div>
    </div>
  );
}

export default App;
