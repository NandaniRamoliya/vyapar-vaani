import React, { useCallback, useEffect, useState } from 'react';
import { Store, Users, IndianRupee, Mic, ShieldCheck, Plus, X, LogOut, KeyRound, Pause, Play, Copy, Check, MessageCircle, Loader2 } from 'lucide-react';
import { adminApi, AdminOverview, AdminShop } from '../services/admin';
import { changePassword, getSession, logout } from '../services/auth';
import { formatINR, openWhatsApp } from '../utils/whatsapp';

/** Platform owner's console: every shop, their logins and health. Shop customer data stays private to each shop. */
export const AdminApp: React.FC = () => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', owner_name: '', phone: '', login: '', password: '', with_demo_data: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ title: string; shop: string; phone?: string; login: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ old: '', next: '' });
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, s] = await Promise.all([adminApi.overview(), adminApi.shops()]);
      setOverview(o);
      setShops(s);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminApi.createShop({ ...form, password: form.password || undefined });
      setCreds({ title: 'Shop created. Share these login details with the owner', shop: res.shop.name, phone: form.phone, login: res.login, password: res.password });
      setForm({ name: '', city: '', owner_name: '', phone: '', login: '', password: '', with_demo_data: false });
      setFormOpen(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async (s: AdminShop) => {
    if (!window.confirm(`Reset the password for ${s.name}? The owner will be logged out.`)) return;
    const res = await adminApi.resetPassword(s.id);
    setCreds({ title: 'New password. Share it with the owner', shop: s.name, phone: s.phone, login: res.login, password: res.password });
  };

  const toggle = async (s: AdminShop) => {
    const next = s.status === 'active' ? 'suspended' : 'active';
    if (next === 'suspended' && !window.confirm(`Pause ${s.name}? The shop can't log in until you resume it. Their data is kept.`)) return;
    await adminApi.setStatus(s.id, next);
    load();
  };

  const credsText = creds ? `VyaparVaani login for ${creds.shop}\nLogin ID: ${creds.login}\nPassword: ${creds.password}\nOpen: ${window.location.origin}${window.location.pathname}` : '';
  const user = getSession()?.user;

  const tiles = overview
    ? [
        { label: 'Shops', value: `${overview.active_shops} / ${overview.shops}`, sub: 'active / total', icon: Store },
        { label: 'Customers', value: overview.customers, sub: 'across all shops', icon: Users },
        { label: 'Udhar tracked', value: formatINR(overview.outstanding), sub: 'outstanding in all khatas', icon: IndianRupee },
        { label: 'Voice commands', value: overview.voice_commands, sub: `${overview.voice_signatures} voice signatures`, icon: Mic },
      ]
    : [];

  const input = 'h-11 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-500';

  return (
    <div className="min-h-[100dvh] bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-6 h-6 text-indigo-300 shrink-0" />
            <div className="min-w-0">
              <p className="font-black leading-tight">VyaparVaani Admin</p>
              <p className="text-[11px] text-slate-400 truncate">Signed in as {user?.login}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPwOpen(!pwOpen)} className="h-10 px-3 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
              <KeyRound className="w-4 h-4" /> <span className="hidden sm:inline">Password</span>
            </button>
            <button onClick={logout} className="h-10 px-3 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-5">
        {pwOpen && (
          <form
            className="bg-white rounded-3xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await changePassword(pw.old, pw.next);
                setPwMsg('Password changed');
                setPw({ old: '', next: '' });
              } catch (err: any) {
                setPwMsg(err.message);
              }
            }}
          >
            <input type="password" placeholder="Current password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} className={`flex-1 ${input}`} required />
            <input type="password" placeholder="New password (6+)" minLength={6} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={`flex-1 ${input}`} required />
            <button className="h-11 px-4 rounded-xl bg-slate-900 text-white font-bold cursor-pointer">Change</button>
            {pwMsg && <p className="text-sm text-slate-600 self-center">{pwMsg}</p>}
          </form>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="bg-white rounded-3xl border border-slate-200 p-4">
              <Icon className="w-5 h-5 text-indigo-600" />
              <p className="mt-2 text-xs font-semibold text-slate-500">{label}</p>
              <p className="text-2xl font-black text-slate-900">{value}</p>
              <p className="text-[11px] text-slate-400">{sub}</p>
            </div>
          ))}
        </div>

        {creds && (
          <div className="rounded-3xl bg-emerald-50 border-2 border-emerald-300 p-4" role="status">
            <div className="flex items-start justify-between gap-2">
              <p className="font-black text-emerald-900">{creds.title}</p>
              <button onClick={() => setCreds(null)} aria-label="Close" className="text-emerald-700 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <p className="mt-1 text-sm text-emerald-900">
              {creds.shop}: login <b className="font-mono">{creds.login}</b> · password <b className="font-mono">{creds.password}</b>
            </p>
            <p className="text-xs text-emerald-800/80 mt-1">Shown only now. Passwords are stored encrypted (hashed) and can't be viewed again, only reset.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(credsText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="h-10 px-3 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-sm font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy
              </button>
              <button onClick={() => openWhatsApp(creds.phone, credsText)} className="h-10 px-3 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                <MessageCircle className="w-4 h-4" /> Send on WhatsApp
              </button>
            </div>
          </div>
        )}

        <section className="bg-white rounded-3xl border border-slate-200">
          <div className="p-4 flex items-center justify-between border-b border-slate-100">
            <h2 className="font-black text-slate-900">Shops ({shops.length})</h2>
            <button onClick={() => setFormOpen(!formOpen)} className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer">
              {formOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} Add shop
            </button>
          </div>

          {formOpen && (
            <form onSubmit={create} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50">
              <input required placeholder="Shop name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
              <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={input} />
              <input placeholder="Owner name" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className={input} />
              <input placeholder="Owner phone (for WhatsApp)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
              <input required placeholder="Login ID * (e.g. shahstore)" pattern="[A-Za-z0-9._@+\-]{3,60}" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} className={input} />
              <input placeholder="Password (leave empty to generate)" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.with_demo_data} onChange={(e) => setForm({ ...form, with_demo_data: e.target.checked })} className="w-4 h-4" />
                Start with sample data (for demos)
              </label>
              <button disabled={busy} className="h-11 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Create shop and login
              </button>
              {error && <p className="sm:col-span-2 text-sm text-rose-600">{error}</p>}
            </form>
          )}

          <div className="divide-y divide-slate-100">
            {shops.map((s) => (
              <div key={s.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900 truncate">{s.name}</p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{s.status === 'active' ? 'active' : 'paused'}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {[s.owner_name, s.city, s.phone].filter(Boolean).join(' · ')} · login <span className="font-mono font-semibold">{s.owner_login}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {s.stats.customers} customers · {s.stats.orders} bills · {formatINR(s.stats.outstanding)} udhar · {s.stats.voice_commands} voice commands · {s.stats.voice_signatures} signatures
                    {s.last_login_at ? ` · last login ${s.last_login_at.slice(0, 16)}` : ' · never logged in'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => reset(s)} className="h-10 px-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                    <KeyRound className="w-4 h-4" /> Reset password
                  </button>
                  <button onClick={() => toggle(s)} className={`h-10 px-3 rounded-xl text-sm font-bold flex items-center gap-1.5 cursor-pointer ${s.status === 'active' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-600 text-white'}`}>
                    {s.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {s.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <p className="text-xs text-slate-400 text-center">Each shop's khata, customers and voice recordings live in that shop's own database. Admins see counts only.</p>
      </main>
    </div>
  );
};
