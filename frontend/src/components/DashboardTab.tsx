import React from 'react';
import { 
  IndianRupee, 
  ShoppingBag, 
  Clock, 
  BellRing, 
  ArrowUpRight, 
  Mic, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  Package
} from 'lucide-react';
import { DashboardStats, Order, LanguageCode } from '../types';

interface DashboardTabProps {
  stats: DashboardStats | null;
  orders: Order[];
  onOpenVoice: () => void;
  onSelectTab: (tab: string) => void;
  language: LanguageCode;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  stats,
  orders,
  onOpenVoice,
  onSelectTab,
  language,
}) => {
  const getBannerText = () => {
    if (language === 'gu-IN') {
      return {
        title: 'બોલીને નવો ઓર્ડર ઉમેરો',
        desc: 'માઇક્રોફોન પર ટેપ કરો અને કહો: "રાહુલ માટે 20 શર્ટ નો ઓર્ડર ઉમેરો, કુલ 15000 રૂપિયા"',
        btn: 'હમણાં જ બોલો',
      };
    }
    if (language === 'hi-IN') {
      return {
        title: 'बोलकर नया ऑर्डर जोड़ें',
        desc: 'माइक पर टैप करें और कहें: "राहुल के लिए 20 शर्ट्स का ऑर्डर जोड़ो कुल 15000 रुपये"',
        btn: 'अभी बोलें',
      };
    }
    return {
      title: 'Voice-to-Order in Action',
      desc: 'Tap the mic and say: "Add an order for Rahul. 20 shirts, total 15000 rupees."',
      btn: 'Speak Order Now',
    };
  };

  const banner = getBannerText();

  return (
    <div className="space-y-6">
      
      {/* Hero Voice Callout Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Build for Bharat • Round 2 Core Demo</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              {banner.title}
            </h2>
            <p className="text-xs md:text-sm text-indigo-200 font-medium">
              {banner.desc}
            </p>
          </div>

          <button
            onClick={onOpenVoice}
            className="self-start md:self-auto flex items-center space-x-2.5 px-6 py-3.5 rounded-2xl bg-white text-indigo-900 font-bold text-sm shadow-lg hover:bg-indigo-50 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Mic className="w-3.5 h-3.5" />
            </div>
            <span>{banner.btn}</span>
          </button>
        </div>

        {/* Ambient background blur elements */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
      </div>

      {/* 4 Key Business Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{Number(stats?.total_revenue || 0).toLocaleString('en-IN')}
            </p>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-600 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% from last week</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {stats?.total_orders || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Recorded via Voice & Dashboard</p>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Orders</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-600 tracking-tight">
              {stats?.pending_orders || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Awaiting dispatch or payment</p>
          </div>
        </div>

        {/* Today's Reminders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Reminders</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <BellRing className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-purple-600 tracking-tight">
              {stats?.today_reminders || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Client calls & follow-ups</p>
          </div>
        </div>

      </div>

      {/* Grid: Recent Orders & Recent Voice Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders (Takes 2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Orders</h3>
              <p className="text-xs text-slate-500">Latest voice & manual bookings</p>
            </div>
            <button
              onClick={() => onSelectTab('orders')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center cursor-pointer"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{order.customer_name}</td>
                    <td className="py-3 px-3 text-slate-600">{order.product_name}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{order.quantity}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">₹{order.total_amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        order.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        order.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        order.status === 'delivered' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Activity & Voice Feed (Takes 1 column) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Voice Activity Feed</h3>
              <p className="text-xs text-slate-500">Live spoken transactions</p>
            </div>
            <button
              onClick={() => onSelectTab('history')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center cursor-pointer"
            >
              <span>History</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {stats?.recent_activity.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold ${item.type === 'voice' ? 'text-indigo-600' : 'text-slate-800'}`}>
                    {item.title}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.timestamp.split(' ')[1] || item.timestamp}</span>
                </div>
                <p className="text-slate-600 text-[11px] font-medium">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
