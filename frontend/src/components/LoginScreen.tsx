import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Mic, Server, Store, ShieldCheck } from 'lucide-react';
import { LanguageCode } from '../types';
import { LANGS, LANG_ORDER } from '../utils/lang';
import { useT } from '../utils/i18n';
import { getServer, login, setServer } from '../services/auth';

interface Props {
  language: LanguageCode;
  onLanguageChange: (l: LanguageCode) => void;
}

const DEMO = [
  { key: 'login.demoShop1' as const, login: 'nandani', password: 'nandani@123', icon: Store, sub: 'Nandani Textiles' },
  { key: 'login.demoShop2' as const, login: 'patel', password: 'patel@123', icon: Store, sub: 'Patel Kirana Store' },
  { key: 'login.demoAdmin' as const, login: 'admin', password: 'admin@123', icon: ShieldCheck, sub: 'admin' },
];

export const LoginScreen: React.FC<Props> = ({ language, onLanguageChange }) => {
  const tr = useT(language);
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverOpen, setServerOpen] = useState(!!import.meta.env.VITE_SHOW_SERVER && !getServer());
  const [server, setServerInput] = useState(getServer());

  const submit = async (l = loginName, p = password) => {
    setBusy(true);
    setError(null);
    try {
      setServer(server);
      await login(l, p);
    } catch (e: any) {
      setError(e instanceof TypeError ? tr('login.noServer') : e?.message || 'Login failed');
      if (e instanceof TypeError) setServerOpen(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-indigo-950 via-indigo-800 to-fuchsia-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-4 gap-1 rounded-2xl bg-white/10 p-1 w-fit mx-auto" role="group" aria-label="Language">
          {LANG_ORDER.map((c) => (
            <button key={c} onClick={() => onLanguageChange(c)} aria-pressed={language === c} className={`h-9 px-4 rounded-xl text-sm font-bold cursor-pointer ${language === c ? 'bg-white text-indigo-800' : 'text-white/80'}`}>
              {LANGS[c].name}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">VyaparVaani</h1>
              <p className="text-xs text-slate-500 leading-snug">{tr('login.tagline')}</p>
            </div>
          </div>

          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label className="block text-sm font-semibold text-slate-600">
              {tr('login.login')}
              <input value={loginName} onChange={(e) => setLoginName(e.target.value)} autoComplete="username" autoCapitalize="none" required className="mt-1 w-full h-12 px-3 rounded-xl border border-slate-300 text-base focus:outline-none focus:border-indigo-500" />
            </label>
            <label className="block text-sm font-semibold text-slate-600">
              {tr('login.password')}
              <div className="mt-1 flex items-center rounded-xl border border-slate-300 focus-within:border-indigo-500">
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={show ? 'text' : 'password'} autoComplete="current-password" required className="flex-1 h-12 px-3 rounded-xl text-base focus:outline-none" />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="w-12 h-12 flex items-center justify-center text-slate-400 cursor-pointer">
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </label>
            {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
              {busy && <Loader2 className="w-5 h-5 animate-spin" />} {busy ? tr('login.wait') : tr('login.submit')}
            </button>
          </form>

          <div className={`mt-6 ${import.meta.env.VITE_HIDE_DEMO === 'true' ? 'hidden' : ''}`}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{tr('login.demo')}</p>
            <div className="mt-2 space-y-2">
              {(import.meta.env.VITE_HIDE_DEMO === 'true' ? [] : DEMO).map((d) => (
                <button key={d.login} disabled={busy} onClick={() => submit(d.login, d.password)} className="w-full h-14 px-3 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 flex items-center gap-3 text-left cursor-pointer disabled:opacity-60">
                  <d.icon className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-bold text-slate-800 text-sm">{tr(d.key)}</span>
                    <span className="block text-xs text-slate-400 truncate">{d.sub} · {d.login} / {d.password}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setServerOpen(!serverOpen)} className="mt-5 text-xs text-slate-400 flex items-center gap-1 cursor-pointer">
            <Server className="w-3.5 h-3.5" /> {tr('login.server')}
          </button>
          {serverOpen && (
            <div className="mt-2">
              <input value={server} onChange={(e) => setServerInput(e.target.value)} placeholder="https://your-server.onrender.com" className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm" />
              <p className="mt-1 text-[11px] text-slate-400">{tr('login.serverHelp')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
