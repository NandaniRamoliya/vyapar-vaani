import React, { useState } from 'react';
import { Languages, BellRing, ShieldCheck, ShieldAlert, Lock, Smartphone, Trash2, Check } from 'lucide-react';
import { ChainCheck, LanguageCode } from '../types';
import { api } from '../services/api';
import { LANGS, LANG_ORDER } from '../utils/lang';
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

  const card = 'bg-white rounded-3xl border border-slate-200 p-5 shadow-xs';
  return (
    <div className="max-w-2xl mx-auto space-y-4">
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
