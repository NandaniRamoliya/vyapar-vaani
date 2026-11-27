import React, { useState } from 'react';
import { 
  Users, 
  Phone, 
  Search, 
  Plus, 
  UserPlus, 
  Calendar, 
  MessageCircle, 
  PhoneCall, 
  Trash2,
  X,
  Store,
  FileText
} from 'lucide-react';
import { Customer } from '../types';
import { api } from '../services/api';

interface CustomersTabProps {
  customers: Customer[];
  onRefresh?: () => void;
  onOpenVoice: () => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ customers, onRefresh, onOpenVoice }) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createCustomer({
        name: name.trim(),
        phone: phone.trim() || '+91 98000 00000',
        business_notes: notes.trim() || 'Direct Account',
      });
      setIsModalOpen(false);
      setName('');
      setPhone('');
      setNotes('');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to add customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsApp = (cust: Customer) => {
    const rawNumber = (cust.phone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Namaste ${cust.name}, greetings from Nandani Textiles! How can we assist you today?`);
    window.open(`https://wa.me/${rawNumber}?text=${text}`, '_blank');
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      c.business_notes.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
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

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Customer</span>
          </button>

          <button
            onClick={onOpenVoice}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add via Voice</span>
          </button>
        </div>
      </div>

      {/* Customers Cards Grid */}
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

              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 line-clamp-2">
                {c.business_notes || 'Regular commercial account'}
              </p>
            </div>

            <div>
              {/* Quick Communication Actions (WhatsApp & Phone Call) */}
              <div className="flex items-center space-x-2 mb-3">
                <button
                  onClick={() => handleWhatsApp(c)}
                  className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <a
                  href={`tel:${c.phone}`}
                  className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" /> Added: {c.created_at ? c.created_at.split(' ')[0] : 'Recent'}
                </span>
                <span className="text-indigo-600 font-semibold">Verified Client</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-md animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Add New Customer</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Business Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Textiles"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / WhatsApp Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Notes / Location</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Surat Wholesale Market, regular buyer of cotton fabrics"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                  {isSubmitting ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
