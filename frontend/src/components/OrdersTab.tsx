import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle,
  Plus,
  Mic,
  ArrowUpDown,
  Share2,
  Trash2,
  Download,
  IndianRupee,
  User,
  Package,
  Layers,
  X
} from 'lucide-react';
import { Order } from '../types';
import { api } from '../services/api';

interface OrdersTabProps {
  orders: Order[];
  onRefresh: () => void;
  onOpenVoice: () => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ orders, onRefresh, onOpenVoice }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Order Form State
  const [newCustomer, setNewCustomer] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newAmount, setNewAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await api.deleteOrder(orderId);
        onRefresh();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.trim() || !newProduct.trim() || !newAmount) return;

    setIsSubmitting(true);
    try {
      await api.createOrder({
        customer_name: newCustomer.trim(),
        product_name: newProduct.trim(),
        quantity: Number(newQuantity) || 1,
        total_amount: Number(newAmount) || 0,
        status: 'confirmed',
      });
      setIsModalOpen(false);
      setNewCustomer('');
      setNewProduct('');
      setNewQuantity(1);
      setNewAmount('');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppShare = (order: Order) => {
    const text = encodeURIComponent(
      `Namaste *${order.customer_name}*,\n\nYour order details from Nandani Textiles:\n• *Product:* ${order.product_name}\n• *Quantity:* ${order.quantity} units\n• *Total Amount:* ₹${order.total_amount.toLocaleString('en-IN')}\n• *Status:* ${order.status.toUpperCase()}\n\nThank you for doing business with us!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const exportCSV = () => {
    const headers = ['Order ID,Customer,Product,Quantity,Total Amount,Status,Date'];
    const rows = orders.map(
      (o) =>
        `"${o.id}","${o.customer_name}","${o.product_name}",${o.quantity},${o.total_amount},"${o.status}","${o.created_at}"`
    );
    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VyaparVaani_Orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders by customer or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-xs focus:outline-none w-full text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            {['all', 'pending', 'confirmed', 'delivered'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                  statusFilter === st ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={exportCSV}
            title="Export orders as CSV"
            className="flex items-center space-x-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>

          <button
            onClick={onOpenVoice}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Order</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No orders found matching criteria. Click "+ New Order" or say "Add order for Rahul"!
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{order.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{order.customer_name}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{order.product_name}</td>
                    <td className="py-3.5 px-4 text-slate-900 font-semibold">{order.quantity}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">₹{order.total_amount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        order.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        order.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        order.status === 'delivered' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1 font-medium focus:outline-none cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>

                        <button
                          onClick={() => handleWhatsAppShare(order)}
                          title="Share WhatsApp bill with customer"
                          className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(order.id)}
                          title="Delete order"
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-md animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Create Manual Order</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
                <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                  <User className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    className="w-full bg-transparent text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Description</label>
                <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                  <Package className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pure Silk Sarees"
                    value={newProduct}
                    onChange={(e) => setNewProduct(e.target.value)}
                    className="w-full bg-transparent text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                  <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                    <Layers className="w-4 h-4 text-slate-400 mr-2" />
                    <input
                      type="number"
                      required
                      min={1}
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(Number(e.target.value))}
                      className="w-full bg-transparent text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount (₹)</label>
                  <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                    <IndianRupee className="w-4 h-4 text-slate-400 mr-2" />
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="15000"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="w-full bg-transparent text-xs focus:outline-none"
                    />
                  </div>
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
                  {isSubmitting ? 'Saving...' : 'Save Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
