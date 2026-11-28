import React, { useState } from 'react';
import { Languages, BellRing, ShieldCheck, ShieldAlert, Lock, Smartphone, Trash2, Check, LogOut, KeyRound, UserRound } from 'lucide-react';
import { ChainCheck, LanguageCode } from '../types';
import { api } from '../services/api';
import { LANGS, LANG_ORDER, getAutoLanguage, setAutoLanguage } from '../utils/lang';
import { changePassword, getSession, logout } from '../services/auth';
import { useT } from '../utils/i18n';
import { askNotificationPermission } from '../utils/speech';

interface Props {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
}

/** Only what a shopkeeper needs: language, alerts, safety and privacy, in plain words. */
export const SettingsTab: React.FC<Props> = ({ language, onLanguageChange }) => {
  const tr = useT(language);
  const [perm, setPerm] = useState<string>(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const [chain, setChain] = useState<ChainCheck | null>(null);
  const [cleared, setCleared] = useState(false);
  const [auto, setAuto] = useState(getAutoLanguage);
  const [pw, setPw] = useState({ old: '', next: '' });
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const session = getSession();

  const card = 'bg-white rounded-3xl border border-slate-200 p-5 shadow-xs';
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <section className={card}>
        <h3 className="font-black text-slate-900 flex items-center gap-2"><UserRound className="w-5 h-5 text-indigo-600" /> {tr('set.account')}</h3>
        <p className="mt-1 text-sm text-slate-600">
          <b>{session?.shop?.name}</b>{session?.shop?.city ? ` · ${session.shop.city}` : ''} · {session?.user.login}
        </p>
        <form
          className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await changePassword(pw.old, pw.next);
              setPwMsg(tr('set.pwChanged'));
              setPw({ old: '', next: '' });
            } catch (err: any) {
              setPwMsg(err.message);
            }
          }}
        >
          <input type="password" required placeholder={tr('set.oldPw')} value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} className="h-11 px-3 rounded-xl border border-slate-300 text-sm" />
          <input type="password" required minLength={6} placeholder={tr('set.newPw')} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className="h-11 px-3 rounded-xl border border-slate-300 text-sm" />
          <button className="h-11 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"><KeyRound className="w-4 h-4" /> {tr('set.changePw')}</button>
        </form>
        {pwMsg && <p className="mt-2 text-sm text-slate-600">{pwMsg}</p>}
        <button onClick={logout} className="mt-3 h-11 px-4 rounded-xl border border-rose-200 text-rose-700 font-bold flex items-center gap-2 cursor-pointer">
          <LogOut className="w-4 h-4" /> {tr('set.logout')}
        </button>
      </section>
      <section className={card}>
        <h3 className="font-black text-slate-900 flex items-center gap-2"><Languages className="w-5 h-5 text-indigo-600" /> {tr('set.language')}</h3>
        <p className="mt-1 text-sm text-slate-500">{tr('set.languageText')}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {LANG_ORDER.map((c) => (
            <button key={c} onClick={() => onLanguageChange(c)} className={`h-12 rounded-2xl font-bold cursor-pointer ${language === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {LANGS[c].name}
            </button>
          ))}
        </div>
      </section>

      <section className={card}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => {
              setAuto(e.target.checked);
              setAutoLanguage(e.target.checked);
            }}
            className="mt-1 w-5 h-5 accent-indigo-600"
          />
          <span>
            <span className="block font-black text-slate-900">{tr('set.autoLang')}</span>
            <span className="block mt-1 text-sm text-slate-500">{tr('set.autoLangText')}</span>
          </span>
        </label>
      </section>

      <section className={card}>
        <h3 className="font-black text-slate-900 flex items-center gap-2"><BellRing className="w-5 h-5 text-amber-500" /> {tr('set.alerts')}</h3>
        <p className="mt-1 text-sm text-slate-500">{perm === 'denied' ? tr('rem.alertsBlocked') : tr('rem.allowText')}</p>
        {perm === 'granted' ? (
          <p className="mt-3 text-sm font-bold text-emerald-700 flex items-center gap-1.5"><Check className="w-4 h-4" /> {tr('rem.alertsOn')}</p>
        ) : perm === 'default' ? (
          <button onClick={async () => setPerm(await askNotificationPermission())} className="mt-3 h-11 px-4 rounded-2xl bg-amber-500 text-white font-bold cursor-pointer">{tr('rem.allowBtn')}</button>
        ) : null}
      </section>

      <section className={card}>
        <h3 className="font-black text-slate-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> {tr('set.safety')}</h3>
        <button onClick={async () => setChain(await api.verifySignatures())} className="mt-3 h-11 px-4 rounded-2xl bg-slate-900 text-white font-bold cursor-pointer">{tr('set.checkNow')}</button>
        {chain && (
          <p className={`mt-3 text-sm font-semibold flex items-center gap-1.5 ${chain.valid ? 'text-emerald-700' : 'text-rose-700'}`}>
            {chain.valid ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {chain.valid ? tr('kh.chainOk', { n: chain.checked }) : tr('kh.chainBad', { name: chain.customer_name || '' })}
          </p>
        )}
      </section>

      <section className={card}>
        <h3 className="font-black text-slate-900 flex items-center gap-2"><Lock className="w-5 h-5 text-slate-600" /> {tr('set.privacy')}</h3>
        <p className="mt-1 text-sm text-slate-500">{tr('set.privacyText')}</p>
      </section>

      <section className={card}>
        <h3 className="font-black text-slate-900 flex items-center gap-2"><Smartphone className="w-5 h-5 text-indigo-600" /> {tr('set.install')}</h3>
        <p className="mt-1 text-sm text-slate-500">{tr('set.installText')}</p>
      </section>

      <button
        onClick={() => {
          try {
            localStorage.removeItem('vv_chat');
          } catch (_e) {
            /* storage unavailable */
          }
          setCleared(true);
        }}
        className="w-full h-12 rounded-2xl border border-slate-300 text-slate-600 font-bold flex items-center justify-center gap-2 cursor-pointer"
      >
        {cleared ? <Check className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />} {tr('set.clearChat')}
      </button>
    </div>
  );
};
