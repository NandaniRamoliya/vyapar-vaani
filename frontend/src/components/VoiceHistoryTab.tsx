import React from 'react';
import { History, Mic, CheckCircle2, Clock, XCircle, Sparkles } from 'lucide-react';
import { VoiceInteraction } from '../types';

interface VoiceHistoryTabProps {
  history: VoiceInteraction[];
  onOpenVoice: () => void;
}

export const VoiceHistoryTab: React.FC<VoiceHistoryTabProps> = ({ history, onOpenVoice }) => {
  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Voice Interaction Audit Log</h3>
          <p className="text-xs text-slate-500">Chronological history of speech recognition & AI executions</p>
        </div>
        <button
          onClick={onOpenVoice}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>New Voice Command</span>
        </button>
      </div>

      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200">
            No voice interactions recorded yet. Tap "New Voice Command" to start!
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                    {item.intent.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Lang: {item.language}</span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  item.status === 'executed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  item.status === 'pending_confirmation' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {item.status.toUpperCase()}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 my-2">
                <p className="text-xs text-slate-800 font-medium">"{item.transcript}"</p>
              </div>

              {item.spoken_response && (
                <div className="flex items-center space-x-2 text-xs text-slate-500 mt-2">
                  <span className="font-semibold text-slate-700">Assistant replied:</span>
                  <span className="italic">{item.spoken_response}</span>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>ID: {item.id}</span>
                <span>{item.created_at}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
