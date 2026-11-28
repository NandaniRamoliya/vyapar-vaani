import React from 'react';
import { Mic } from 'lucide-react';
import { LanguageCode, VoiceInteraction } from '../types';
import { ago, hasKey, useT } from '../utils/i18n';

interface Props {
  history: VoiceInteraction[];
  language: LanguageCode;
  onOpenVoice: () => void;
}

const STATUS_CLS: Record<string, string> = {
  executed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-600',
  info: 'bg-indigo-100 text-indigo-800',
  pending_confirmation: 'bg-amber-100 text-amber-800',
};

/** Plain-language log: what you said, what Vaani understood, what happened. */
export const VoiceHistoryTab: React.FC<Props> = ({ history, language, onOpenVoice }) => {
  const tr = useT(language);
  const intentLabel = (i: string) => {
    const key = `int.${i}`;
    return hasKey(key) ? tr(key) : tr('int.other');
  };
  const statusLabel = (st: string) => {
    const key = `his.st.${st}`;
    return hasKey(key) ? tr(key) : st;
  };

  if (!history.length) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-slate-400">{tr('his.empty')}</p>
        <button onClick={onOpenVoice} className="mt-4 h-12 px-5 rounded-2xl bg-indigo-600 text-white font-bold inline-flex items-center gap-2 cursor-pointer">
          <Mic className="w-5 h-5" /> {tr('nav.talk')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {history.map((h) => (
        <div key={h.id} className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5">{intentLabel(h.intent)}</span>
            <span className="flex items-center gap-2">
              <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${STATUS_CLS[h.status] || 'bg-slate-100 text-slate-600'}`}>{statusLabel(h.status)}</span>
              <span className="text-xs text-slate-400">{ago(language, h.created_at)}</span>
            </span>
          </div>
          <p className="mt-2 text-[15px] text-slate-900">
            <span className="text-slate-400 text-xs font-semibold mr-1">{tr('his.youSaid')}:</span>“{h.transcript}”
          </p>
          {h.spoken_response && (
            <p className="mt-1 text-sm text-slate-600">
              <span className="text-slate-400 text-xs font-semibold mr-1">{tr('his.vaani')}:</span>
              {h.spoken_response}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
