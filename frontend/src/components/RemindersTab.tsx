import React, { useState } from 'react';
import { 
  BellRing, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Plus, 
  Mic, 
  Trash2, 
  X,
  User,
  Check
} from 'lucide-react';
import { Reminder } from '../types';
import { api } from '../services/api';

interface RemindersTabProps {
  reminders: Reminder[];
  onRefresh: () => void;
  onOpenVoice: () => void;
}

export const RemindersTab: React.FC<RemindersTabProps> = ({ reminders, onRefresh, onOpenVoice }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00 AM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async (id: string) => {
    try {
      await api.toggleReminder(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this reminder?')) {
      try {
        await api.deleteReminder(id);
        onRefresh();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createReminder({
        title: title.trim(),
        customer_name: customerName.trim() || undefined,
        reminder_date: date,
        reminder_time: time,
        status: 'pending',
      });
      setIsModalOpen(false);
      setTitle('');
      setCustomerName('');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to add reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReminders = reminders.filter((rem) => {
    if (filter === 'pending') return rem.status === 'pending';
    if (filter === 'completed') return rem.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Follow-up Reminders</h3>
          <p className="text-xs text-slate-500">Scheduled client phone calls, catalogs and payment follow-ups</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Filters */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            {(['all', 'pending', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                  filter === f ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Reminder</span>
          </button>

          <button
            onClick={onOpenVoice}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Add via Voice</span>
          </button>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {filteredReminders.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200 text-xs">
            No reminders found in this category. Click "+ New Reminder" or say "Remind me to call Rahul tomorrow at 11 AM"!
          </div>
        ) : (
          filteredReminders.map((rem) => {
            const isDone = rem.status === 'completed';
            return (
              <div
                key={rem.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  isDone
                    ? 'bg-slate-50/70 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <button
                    onClick={() => handleToggle(rem.id)}
                    title={isDone ? 'Mark Pending' : 'Mark Completed'}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-indigo-600 bg-white'
                    }`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
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

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    isDone ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {rem.status.toUpperCase()}
                  </span>

                  <button
                    onClick={() => handleDelete(rem.id)}
                    title="Delete reminder"
                    className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Reminder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-md animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <BellRing className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Schedule New Reminder</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reminder Task</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call Rahul to verify dispatch"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Related Customer (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    required
                    placeholder="11:00 AM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs"
                >
                  {isSubmitting ? 'Scheduling...' : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
