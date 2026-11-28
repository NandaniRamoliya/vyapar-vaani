import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, Mic, ShieldCheck, Shirt, ShoppingBasket } from 'lucide-react';
import { LanguageCode } from '../types';
import { useT } from '../utils/i18n';
import { WrongRoleError, login } from '../services/auth';

const SHOW_DEMO = import.meta.env.VITE_HIDE_DEMO !== 'true';

function errorText(e: any, wrong: string, offline: string, wrongRole: string): string {
  if (e instanceof WrongRoleError) return wrongRole;
  if (e instanceof TypeError) return offline; // network / server asleep
  if (e?.status === 401) return wrong;
  return e?.message || wrong;
}

/** Password box with a show/hide eye, shared by both logins. */
const PasswordInput: React.FC<{ value: string; onChange: (v: string) => void; id: string; dark?: boolean }> = ({ value, onChange, id, dark }) => {
  const [show, setShow] = useState(false);
  return (
    <div className={`mt-1.5 flex items-center rounded-2xl border ${dark ? 'border-slate-600 bg-slate-800 focus-within:border-indigo-400' : 'border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100'}`}>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={show ? 'text' : 'password'}
        autoComplete="current-password"
        required
        className={`flex-1 min-w-0 h-12 px-4 rounded-2xl bg-transparent text-base focus:outline-none ${dark ? 'text-white' : 'text-slate-900'}`}
      />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className={`w-12 h-12 flex items-center justify-center cursor-pointer ${dark ? 'text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ shop login */

export const ShopLogin: React.FC<{ language: LanguageCode }> = ({ language }) => {
  const tr = useT(language);
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (l: string, p: string, which: string) => {
    setBusy(which);
    setError(null);
    try {
      await login(l, p, 'shopkeeper');
    } catch (e) {
      setError(errorText(e, tr('login.wrong'), tr('login.offline'), tr('login.wrongRole')));
      setBusy(null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      {/* Brand band */}
      <div className="bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 px-6 pt-[max(env(safe-area-inset-top),40px)] pb-24 text-center">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
          <Mic className="w-8 h-8 text-white" />
        </div>
        <h1 className="mt-4 text-3xl font-black text-white tracking-tight">VyaparVaani</h1>
        <p className="mt-1 text-sm text-indigo-100 max-w-xs mx-auto">{tr('login.tagline')}</p>
      </div>

      {/* Card */}
      <div className="flex-1 px-4 -mt-16 pb-8">
        <div className="mx-auto w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-indigo-900/10 border border-slate-100 p-6">
          <h2 className="text-xl font-black text-slate-900">{tr('login.title')}</h2>

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit(loginName, password, 'form');
            }}
          >
            <div>
              <label htmlFor="shop-login" className="text-sm font-semibold text-slate-700">{tr('login.login')}</label>
              <input
                id="shop-login"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder={tr('login.loginPh')}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label htmlFor="shop-password" className="text-sm font-semibold text-slate-700">{tr('login.password')}</label>
              <PasswordInput id="shop-password" value={password} onChange={setPassword} />
            </div>

            {error && (
              <p className="text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={!!busy} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-colors">
              {busy === 'form' && <Loader2 className="w-5 h-5 animate-spin" />}
              {busy === 'form' ? tr('login.wait') : tr('login.submit')}
            </button>
            <p className="text-xs text-slate-500 text-center leading-relaxed">{tr('login.forgot')}</p>
          </form>

          {SHOW_DEMO && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 text-center">{tr('login.demo')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { id: 'demo1', label: tr('login.demoShop1'), icon: Shirt, l: 'nandani', p: 'nandani@123' },
                  { id: 'demo2', label: tr('login.demoShop2'), icon: ShoppingBasket, l: 'patel', p: 'patel@123' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!!busy}
                    onClick={() => submit(d.l, d.p, d.id)}
                    className="h-12 px-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {busy === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <d.icon className="w-4 h-4 text-indigo-600" />}
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ admin login */

export const AdminLogin: React.FC = () => {
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(loginName, password, 'admin');
    } catch (err) {
      setError(
        errorText(err, 'Wrong admin ID or password', 'Can’t connect right now. Try again in a minute.', 'This is a shop account. Shopkeepers log in on the shop login.'),
      );
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">VyaparVaani Admin</h1>
            <p className="text-sm text-slate-400">Platform console: shops, logins and access</p>
          </div>
        </div>

        <form onSubmit={submit} className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4">
          <div>
            <label htmlFor="admin-login" className="text-sm font-semibold text-slate-300">Admin ID</label>
            <input
              id="admin-login"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-slate-600 bg-slate-800 text-base text-white focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="text-sm font-semibold text-slate-300">Password</label>
            <PasswordInput id="admin-password" value={password} onChange={setPassword} dark />
          </div>
          {error && (
            <p className="text-sm font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="w-full h-12 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-colors">
            {busy && <Loader2 className="w-5 h-5 animate-spin" />} {busy ? 'Logging in…' : 'Log in to console'}
          </button>
        </form>

        <a href="#/" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Shop login
        </a>
      </div>
    </div>
  );
};
