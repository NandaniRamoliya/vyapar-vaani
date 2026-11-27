import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { DashboardTab } from './components/DashboardTab';
import { OrdersTab } from './components/OrdersTab';
import { CustomersTab } from './components/CustomersTab';
import { RemindersTab } from './components/RemindersTab';
import { VoiceHistoryTab } from './components/VoiceHistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { VoiceOSView } from './components/VoiceOSView';
import { DashboardStats, Order, Customer, Reminder, VoiceInteraction, LanguageCode } from './types';
import { api } from './services/api';
import { Mic } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState('voice_os');
  const [language, setLanguage] = useState<LanguageCode>('en-IN');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [history, setHistory] = useState<VoiceInteraction[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleVoiceCompleted = () => {
    // Instantly refresh all data to show updated dashboard & orders!
    loadAllData();
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans antialiased overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenVoice={() => setIsVoiceOpen(true)}
        language={language}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          currentTab={currentTab}
          language={language}
          onLanguageChange={setLanguage}
          onOpenVoice={() => setIsVoiceOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Loading VyaparVaani workspace...
            </div>
          ) : (
            <>
              {currentTab === 'voice_os' && (
                <VoiceOSView
                  language={language}
                  onLanguageChange={setLanguage}
                  onRefreshData={loadAllData}
                />
              )}
              {currentTab === 'overview' && (
                <DashboardTab
                  stats={stats}
                  orders={orders}
                  onOpenVoice={() => setIsVoiceOpen(true)}
                  onSelectTab={setCurrentTab}
                  language={language}
                />
              )}
              {currentTab === 'orders' && (
                <OrdersTab
                  orders={orders}
                  onRefresh={loadAllData}
                  onOpenVoice={() => setIsVoiceOpen(true)}
                />
              )}
              {currentTab === 'customers' && (
                <CustomersTab
                  customers={customers}
                  onRefresh={loadAllData}
                  onOpenVoice={() => setIsVoiceOpen(true)}
                />
              )}
              {currentTab === 'reminders' && (
                <RemindersTab
                  reminders={reminders}
                  onRefresh={loadAllData}
                  onOpenVoice={() => setIsVoiceOpen(true)}
                />
              )}
              {currentTab === 'history' && (
                <VoiceHistoryTab
                  history={history}
                  onOpenVoice={() => setIsVoiceOpen(true)}
                />
              )}
              {currentTab === 'settings' && <SettingsTab />}
            </>
          )}
        </main>
      </div>

      {/* Global Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        language={language}
        onActionCompleted={handleVoiceCompleted}
      />

      {/* Floating Microphone CTA for Mobile / Quick Access */}
      <button
        onClick={() => setIsVoiceOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer z-40 group sm:hidden"
        title="Start speaking"
      >
        <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
}

export default App;
