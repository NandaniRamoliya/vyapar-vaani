import React, { useState } from 'react';
import { Users, Phone, MapPin, Search, Plus, UserPlus, ShoppingBag, Calendar } from 'lucide-react';
import { Customer } from '../types';

interface CustomersTabProps {
  customers: Customer[];
  onOpenVoice: () => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ customers, onOpenVoice }) => {
  const [search, setSearch] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      c.business_notes.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name, phone or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none text-xs focus:outline-none w-full text-slate-900"
          />
        </div>

        <button
          onClick={onOpenVoice}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add via Voice</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-bold text-slate-900">{c.name}</h4>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{c.id}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-indigo-600 font-semibold mb-3">
                <Phone className="w-3.5 h-3.5" />
                <span>{c.phone || '+91 98000 00000'}</span>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                {c.business_notes || 'Regular commercial account'}
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" /> Added: {c.created_at.split(' ')[0]}
              </span>
              <span className="text-indigo-600 font-semibold">Active Client</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
