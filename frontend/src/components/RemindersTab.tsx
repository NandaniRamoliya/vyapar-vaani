import React from 'react';
import { BellRing, CheckCircle2, Clock, Calendar, Plus, Mic } from 'lucide-react';
import { Reminder } from '../types';
import { api } from '../services/api';

interface RemindersTabProps {
  reminders: Reminder[];
  onRefresh: () => void;
  onOpenVoice: () => void;
}

export const RemindersTab: React.FC<RemindersTabProps> = ({ reminders, onRefresh, onOpenVoice }) => {
  const handleToggle = async (id: string) => {
    try {
      await api.toggleReminder(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Follow-up Reminders</h3>
          <p className="text-xs text-slate-500">Track pending phone calls, catalogs and payments</p>
        </div>
        <button
          onClick={onOpenVoice}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Add via Voice</span>
        </button>
      </div>

      <div className="space-y-3">
        {reminders.map((rem) => {
          const isDone = rem.status === 'completed';
          return (
            <div
              key={rem.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                isDone
                  ? 'bg-slate-50/60 border-slate-200 opacity-60'
                  : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <button
                  onClick={() => handleToggle(rem.id)}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                    isDone
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 hover:border-indigo-600 bg-white'
                  }`}
                >
                  {isDone && <CheckCircle2 className="w-4 h-4" />}
                </button>
                <div>
                  <h4 className={`text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {rem.title}
                  </h4>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {rem.reminder_date}
                    </span>
                    <span className="flex items-center font-medium text-indigo-600">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {rem.reminder_time}
                    </span>
                    {rem.customer_name && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        {rem.customer_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                isDone ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800'
              }`}>
                {rem.status.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
