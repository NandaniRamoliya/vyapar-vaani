import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Keyboard,
  Send,
  Volume2,
  VolumeX,
  Hand,
  Check,
  X,
  BookOpen,
  MessageCircle,
  Share2,
  ShieldCheck,
  Loader2,
  RotateCcw,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  MessageSquarePlus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AgentContext, LanguageCode, SignatureRequest, VoiceProcessResult, VoiceSignature } from '../types';
import { useVoice } from '../hooks/useVoice';
import { useRecorder } from '../hooks/useRecorder';
import { api } from '../services/api';
import { classifyConfirmation } from '../utils/confirmWords';
import { LANGS, LANG_ORDER } from '../utils/lang';
import { t } from '../utils/i18n';
import { askNotificationPermission } from '../utils/speech';
import { playSoundboxChime } from '../utils/soundboxChime';
import { playDoneTone, playListenTone, playRecordTone } from '../utils/sounds';
import { ProofPlayer, ProofPlayerHandle } from './ProofPlayer';
import {
  SHOP_NAME,
  formatINR,
  openWhatsApp,
  paymentReceiptMessage,
  paymentReminderMessage,
  shareVoiceProof,
} from '../utils/whatsapp';

interface Props {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onRefreshData?: () => void;
  onOpenKhata?: () => void;
}

type SigStatus = 'ask' | 'recording' | 'saving' | 'done' | 'skipped' | 'error';

interface KhataInfo {
  customer_name: string;
  phone?: string;
  balance: number;
  entry_type?: 'credit' | 'payment';
  amount?: number;
  recent?: { id: string; entry_type: 'credit' | 'payment'; amount: number; created_at: string }[];
  proofs?: VoiceSignature[];
}

interface Msg {
  id: string;
  from: 'me' | 'vaani';
  text: string;
  kind?: 'confirm' | 'receipt' | 'khata' | 'dues' | 'hisaab' | 'proof' | 'signature' | 'alerts';
  pending?: VoiceProcessResult;
  khata?: KhataInfo;
  receipt?: Record<string, any>;
  dues?: { total_outstanding: number; top: { customer_id: string; customer_name: string; phone: string; balance: number }[] };
  hisaab?: Record<string, any>;
  proofs?: VoiceSignature[];
  sig?: { request: SignatureRequest; status: SigStatus; signature?: VoiceSignature; error?: string };
}

const CHAT_KEY = 'vv_chat';
interface SavedChat {
  messages: Msg[];
  resolved: Record<string, 'yes' | 'no' | 'expired'>;
  ctx: AgentContext;
}
function loadChat(): SavedChat | null {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return null;
    const chat = JSON.parse(raw) as SavedChat;
    // Questions left unanswered before the reload can't be answered any more
    for (const m of chat.messages || []) {
      if (m.kind === 'confirm' && m.pending && !chat.resolved?.[m.pending.interaction_id]) {
        chat.resolved = { ...(chat.resolved || {}), [m.pending.interaction_id]: 'expired' };
      }
      if (m.sig && (m.sig.status === 'recording' || m.sig.status === 'saving')) m.sig.status = 'ask';
    }
    if (chat.ctx) chat.ctx.pending = null;
    return chat;
  } catch (_e) {
    return null;
  }
}
function saveChat(chat: SavedChat) {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(chat));
  } catch (_e) {
    /* storage full or unavailable: the chat just won't survive a reload */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let msgSeq = 0;
const newId = () => `m${Date.now()}_${msgSeq++}`;

export const VoiceAgent: React.FC<Props> = ({ language, onLanguageChange, onRefreshData, onOpenKhata }) => {
  const L = LANGS[language];
  // Conversation survives reloads: the last messages, Vaani's memory and which cards were answered
  const saved = useState(() => loadChat())[0];
  const [messages, setMessages] = useState<Msg[]>(saved?.messages?.length ? saved.messages : [{ id: 'welcome', from: 'vaani', text: L.ui.welcome }]);
  const [thinking, setThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [handsFree, setHandsFree] = useState(true);
  const [awaiting, setAwaiting] = useState<null | 'confirm' | 'answer'>(null);
  const [resolved, setResolved] = useState<Record<string, 'yes' | 'no' | 'expired'>>(saved?.resolved || {});
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [typed, setTyped] = useState('');

  const ctxRef = useRef<AgentContext>(saved?.ctx || {});
  const convoRef = useRef(false); // hands-free conversation in progress: reopen the mic after every reply
  const missRef = useRef(0); // consecutive times nobody spoke
  const pendingRef = useRef<VoiceProcessResult | null>(null);
  const [hasPending, setHasPending] = useState(false); // mirrors pendingRef for rendering
  const handledRef = useRef<Set<string>>(new Set());
  const retryRef = useRef(0);
  const busyRef = useRef(false);
  const greetedRef = useRef(false);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const proofRefs = useRef<Record<string, ProofPlayerHandle | null>>({});
  const settingsRef = useRef({ muted, handsFree, language });
  useEffect(() => {
    settingsRef.current = { muted, handsFree, language };
  }, [muted, handsFree, language]);

  // Re-greet in the newly chosen language (only while the conversation is still fresh)
  useEffect(() => {
    setMessages((prev) => (prev.length === 1 && prev[0].id === 'welcome' ? [{ ...prev[0], text: LANGS[language].ui.welcome }] : prev));
  }, [language]);

  const recorder = useRecorder();

  useEffect(() => {
    saveChat({ messages: messages.slice(-50), resolved, ctx: { ...ctxRef.current, pending: ctxRef.current.pending } });
  }, [messages, resolved]);

  const heard = (text: string) => {
    setAwaiting(null);
    missRef.current = 0;
    const t = text.trim();
    if (!t) return;
    const pending = pendingRef.current;
    if (pending) handleReply(t, pending);
    else run(t);
  };

  // Nobody spoke: give it one more chance, then go quiet until the next tap
  const noSpeech = () => {
    const kind = awaitingRef.current;
    setAwaiting(null);
    missRef.current += 1;
    if (convoRef.current && missRef.current < 2 && settingsRef.current.handsFree) {
      listen(kind, kind === 'confirm' ? 1200 : 1800);
    } else {
      convoRef.current = false;
      missRef.current = 0;
    }
  };

  const voice = useVoice({ language, onFinalTranscript: heard, onNoSpeech: noSpeech });
  const { isListening, isSpeaking, interimTranscript, error: voiceError } = voice;

  const phase: 'recording' | 'listening' | 'thinking' | 'speaking' | 'idle' = recorder.isRecording
    ? 'recording'
    : isListening
      ? 'listening'
      : thinking
        ? 'thinking'
        : isSpeaking
          ? 'speaking'
          : 'idle';

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking, interimTranscript]);

  // ---------------------------------------------------------------- helpers
  const push = (m: Omit<Msg, 'id'>) => {
    const id = newId();
    setMessages((prev) => [...prev, { ...m, id }]);
    return id;
  };
  const patch = (id: string, fn: (m: Msg) => Msg) => setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));

  const talk = (text: string, onEnd?: () => void) => {
    const { muted: isMuted, language: lang } = settingsRef.current;
    if (isMuted || !text) {
      onEnd?.();
      return;
    }
    voice.speak(text, lang, onEnd);
  };

  const awaitingRef = useRef<null | 'confirm' | 'answer'>(null);
  const listen = (kind: 'confirm' | 'answer' | null, silenceMs = 1800) => {
    setAwaiting(kind);
    awaitingRef.current = kind;
    playListenTone();
    voice.startListening({ lang: settingsRef.current.language, silenceMs });
  };

  /** Hands-free conversation: after Vaani finishes speaking, listen again (until the person goes quiet). */
  const continueConversation = () => {
    if (!settingsRef.current.handsFree || !convoRef.current || document.hidden) return;
    listen(pendingRef.current ? 'confirm' : ctxRef.current.pending ? 'answer' : null);
  };

  /** After Vaani asks something, open the mic for the answer (hands-free mode). */
  const listenForAnswer = (kind: 'confirm' | 'answer', forId?: string) => {
    if (!settingsRef.current.handsFree) return;
    if (kind === 'confirm' && pendingRef.current?.interaction_id !== forId) return;
    listen(kind, kind === 'confirm' ? 1200 : 1800);
  };

  // ---------------------------------------------------------------- one utterance
  // Utterances are handled strictly one after another, so nothing said while Vaani is busy gets lost
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const run = (text: string) => {
    queueRef.current = queueRef.current.then(() => runNow(text));
    return queueRef.current;
  };

  const runNow = async (text: string) => {
    busyRef.current = true;
    push({ from: 'me', text });
    setThinking(true);
    const started = Date.now();
    try {
      const res = await api.processVoice(text, settingsRef.current.language, false, ctxRef.current);
      await sleep(Math.max(0, 420 - (Date.now() - started))); // a natural beat before answering
      setThinking(false);
      ctxRef.current = res.context || {};
      render(res);
    } catch (e) {
      console.error(e);
      setThinking(false);
      const msg = 'Network problem, please try again.';
      push({ from: 'vaani', text: msg });
      talk(msg);
    } finally {
      busyRef.current = false;
    }
  };

  const render = (res: VoiceProcessResult) => {
    const d = res.extracted_data || {};

    if (res.confirmation_required) {
      pendingRef.current = res;
      setHasPending(true);
      retryRef.current = 0;
      push({ from: 'vaani', text: res.confirmation_prompt, kind: 'confirm', pending: res });
      talk(res.confirmation_prompt, () => listenForAnswer('confirm', res.interaction_id));
      return;
    }

    const spoken = res.spoken_response;
    let afterSpeak: (() => void) | undefined;

    if (res.intent === 'check_balance' && d.found) {
      push({
        from: 'vaani',
        text: spoken,
        kind: 'khata',
        khata: {
          customer_name: d.customer_name || '',
          phone: d.phone,
          balance: d.balance,
          recent: d.recent_entries,
          proofs: d.proofs,
        },
      });
    } else if (res.intent === 'play_proof' && d.found && d.proofs?.length) {
      const id = push({ from: 'vaani', text: spoken, kind: 'proof', proofs: d.proofs, khata: { customer_name: d.customer_name || '', phone: d.phone, balance: d.balance } });
      afterSpeak = () => proofRefs.current[`${id}_0`]?.play();
    } else if (res.intent === 'list_dues' && d.khata_summary) {
      push({ from: 'vaani', text: spoken, kind: 'dues', dues: d.khata_summary });
    } else if (res.intent === 'show_business_summary' && d.stats) {
      push({ from: 'vaani', text: spoken, kind: 'hisaab', hisaab: d.stats });
    } else {
      push({ from: 'vaani', text: spoken });
    }

    const askedQuestion = !!res.context?.pending;
    talk(spoken, () => {
      if (afterSpeak) return afterSpeak(); // playing a voice proof: don't record over it
      if (askedQuestion) listenForAnswer('answer');
      else continueConversation();
    });
    onRefreshData?.();
  };

  // ---------------------------------------------------------------- yes / no
  const dropPending = () => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    setHasPending(false);
    handledRef.current.add(p.interaction_id);
    setResolved((r) => ({ ...r, [p.interaction_id]: 'no' }));
    api.confirmVoiceAction(p.interaction_id, false).catch(() => {});
  };

  const handleReply = (text: string, pending: VoiceProcessResult) => {
    const verdict = classifyConfirmation(text);
    if (verdict) {
      push({ from: 'me', text });
      confirm(verdict === 'yes', pending);
      return;
    }
    if (text.split(/\s+/).length >= 3) {
      // Not an answer: the merchant moved on to a new instruction
      dropPending();
      run(text);
      return;
    }
    push({ from: 'me', text });
    if (retryRef.current < 1) {
      retryRef.current += 1;
      const ask = L.ui.sayYesNo;
      push({ from: 'vaani', text: ask });
      talk(ask, () => listenForAnswer('confirm', pending.interaction_id));
    }
  };

  const confirm = async (yes: boolean, target: VoiceProcessResult) => {
    if (handledRef.current.has(target.interaction_id)) return;
    handledRef.current.add(target.interaction_id);
    if (pendingRef.current?.interaction_id === target.interaction_id) {
      pendingRef.current = null;
      setHasPending(false);
    }
    voice.cancelListening();
    voice.stopSpeaking();
    setAwaiting(null);
    setResolved((r) => ({ ...r, [target.interaction_id]: yes ? 'yes' : 'no' }));

    try {
      const out = await api.confirmVoiceAction(target.interaction_id, yes);
      if (!yes) {
        push({ from: 'vaani', text: out.spoken_response });
        talk(out.spoken_response, continueConversation);
        return;
      }
      const r = out.executed_result || {};
      if (r.entry?.id) ctxRef.current = { ...ctxRef.current, last_action: { type: 'ledger', id: r.entry.id } };
      if (r.order_id) ctxRef.current = { ...ctxRef.current, last_action: { type: 'order', id: r.order_id } };
      if (target.intent === 'undo_last') ctxRef.current = { ...ctxRef.current, last_action: null };

      playSoundboxChime();
      if (target.intent === 'record_payment' || target.intent === 'create_order') {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
      }

      if (target.intent === 'create_order') {
        push({ from: 'vaani', text: out.spoken_response, kind: 'receipt', receipt: r });
      } else if (target.intent === 'add_udhar' || target.intent === 'record_payment') {
        push({
          from: 'vaani',
          text: out.spoken_response,
          kind: 'khata',
          khata: { customer_name: r.customer_name, phone: r.phone, balance: r.balance, entry_type: r.entry_type, amount: r.amount },
        });
      } else {
        push({ from: 'vaani', text: out.spoken_response });
        if (target.intent === 'create_reminder' && 'Notification' in window && Notification.permission === 'default') {
          push({ from: 'vaani', text: t(settingsRef.current.language, 'rem.allowText'), kind: 'alerts' });
        }
      }

      const sigReq: SignatureRequest | null = r.signature_request || null;
      if (sigReq && recorder.isSupported) {
        const sigId = push({ from: 'vaani', text: sigReq.prompt, kind: 'signature', sig: { request: sigReq, status: 'ask' } });
        talk(`${out.spoken_response} ${sigReq.prompt}`, () => {
          if (settingsRef.current.handsFree) captureSignature(sigId, sigReq);
        });
      } else {
        talk(out.spoken_response, continueConversation);
      }
      onRefreshData?.();
    } catch (e: any) {
      const msg = e?.message || 'Could not complete that.';
      push({ from: 'vaani', text: msg });
      talk(msg);
    }
  };

  // ---------------------------------------------------------------- voice signature
  const captureSignature = async (msgId: string, req: SignatureRequest) => {
    voice.cancelListening();
    voice.stopSpeaking();
    patch(msgId, (m) => ({ ...m, sig: { ...m.sig!, status: 'recording', error: undefined } }));
    playRecordTone();
    await sleep(350); // let the start tone finish so it isn't part of the signature
    try {
      const rec = await recorder.record({ maxMs: 10000, silenceMs: 1500, minMs: 1200 });
      if (rec.blob.size < 800 || rec.durationMs < 700) throw new Error('too-short');
      patch(msgId, (m) => ({ ...m, sig: { ...m.sig!, status: 'saving' } }));
      const signature = await api.uploadSignature(req.entry_id, rec.blob, rec.durationMs, req.phrase, settingsRef.current.language);
      patch(msgId, (m) => ({ ...m, sig: { ...m.sig!, status: 'done', signature } }));
      playDoneTone();
      talk(req.thanks, continueConversation);
      onRefreshData?.();
    } catch (e: any) {
      const denied = e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
      const error = denied ? LANGS[settingsRef.current.language].ui.micBlocked : e?.message === 'too-short' ? 'Too short, please try again.' : e?.message || 'Recording failed';
      patch(msgId, (m) => ({ ...m, sig: { ...m.sig!, status: 'error', error } }));
    }
  };

  const skipSignature = (msgId: string) => patch(msgId, (m) => ({ ...m, sig: { ...m.sig!, status: 'skipped' } }));

  // ---------------------------------------------------------------- the big button
  const onOrb = () => {
    if (phase === 'recording') return recorder.stop();
    if (phase === 'listening') {
      if (!interimTranscript) convoRef.current = false; // tapped stop without speaking: end the conversation
      return voice.stopListening();
    }
    if (phase === 'thinking') return;
    if (phase === 'speaking') voice.stopSpeaking(); // barge in

    const kind = pendingRef.current ? 'confirm' : ctxRef.current.pending ? 'answer' : null;
    convoRef.current = true;
    missRef.current = 0;
    if (!greetedRef.current && !muted && !pendingRef.current) {
      greetedRef.current = true;
      const hello = { 'en-IN': 'Namaste ji, tell me.', 'hi-IN': 'नमस्ते जी, बोलिए।', 'gu-IN': 'નમસ્તે જી, બોલો.' }[language];
      voice.speak(hello, language, () => listen(kind));
      return;
    }
    greetedRef.current = true;
    listen(kind);
  };

  const newChat = () => {
    voice.cancelListening();
    voice.stopSpeaking();
    convoRef.current = false;
    dropPending();
    ctxRef.current = {};
    setResolved({});
    setMessages([{ id: 'welcome', from: 'vaani', text: LANGS[settingsRef.current.language].ui.welcome }]);
  };

  const submitTyped = () => {
    const t = typed.trim();
    if (!t) return;
    setTyped('');
    heard(t);
  };

  const runChip = (text: string) => {
    voice.cancelListening();
    voice.stopSpeaking();
    dropPending();
    run(text);
  };

  // ---------------------------------------------------------------- UI pieces
  const status =
    phase === 'recording'
      ? L.ui.recording
      : phase === 'listening'
        ? awaiting === 'confirm'
          ? L.ui.sayYesNo
          : L.ui.listening
        : phase === 'thinking'
          ? L.ui.thinking
          : phase === 'speaking'
            ? L.ui.speaking
            : hasPending
              ? L.ui.sayYesNo
              : L.ui.tapToTalk;

  const errorText = voiceError === 'mic-blocked' ? L.ui.micBlocked : voiceError;

  const balanceTone = (b: number) =>
    b > 0 ? { label: L.ui.balanceDue, cls: 'text-rose-600' } : b === 0 ? { label: L.ui.settled, cls: 'text-emerald-600' } : { label: L.ui.advance, cls: 'text-sky-600' };

  const share = (sig: VoiceSignature, phone?: string) =>
    shareVoiceProof({
      audioUrl: sig.audio_url,
      customerName: sig.customer_name,
      phone,
      amount: sig.amount,
      date: sig.created_at.slice(0, 10),
      lang: language,
    });

  const renderCard = (m: Msg) => {
    switch (m.kind) {
      case 'confirm': {
        const res = m.pending!;
        const d = res.extracted_data;
        const state = resolved[res.interaction_id];
        const isEntry = res.intent === 'add_udhar' || res.intent === 'record_payment';
        return (
          <div className={`mt-2 rounded-3xl border-2 p-4 bg-white shadow-sm ${state ? 'border-slate-200 opacity-75' : 'border-indigo-300'}`}>
            {isEntry && (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">
                    {d.customer_name}
                    {d.is_new_customer && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold align-middle">NEW</span>}
                  </p>
                  <p className={`text-xs font-bold ${res.intent === 'add_udhar' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {res.intent === 'add_udhar' ? '+ udhar' : '− jama'} {formatINR(d.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-black">
                  <span className="text-slate-400 line-through decoration-1">{formatINR(d.current_balance)}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="text-indigo-700 text-lg">{formatINR(d.new_balance)}</span>
                </div>
              </div>
            )}
            {res.intent === 'create_order' && (
              <div className="text-sm space-y-1">
                <p className="font-black text-slate-900">{d.customer_name}</p>
                <p className="text-slate-600">
                  {d.quantity} × {d.product_name}
                </p>
                <div className="flex justify-between items-center">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${d.payment_mode === 'udhar' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {d.payment_mode === 'udhar' ? 'UDHAR' : 'PAID'}
                  </span>
                  <span className="text-lg font-black text-indigo-700">{formatINR(Number(d.total_amount || 0))}</span>
                </div>
              </div>
            )}
            {res.intent === 'add_customer' && (
              <div className="text-sm">
                <p className="text-lg font-black text-slate-900">{d.name}</p>
                {d.phone && <p className="text-slate-500">{d.phone}</p>}
              </div>
            )}
            {res.intent === 'create_reminder' && (
              <div className="text-sm">
                <p className="font-black text-slate-900">🔔 {d.title}</p>
                <p className="text-slate-500">{d.when_text}</p>
              </div>
            )}
            {/* other questions: the bubble above already says it, the card only carries the buttons */}

            {state ? (
              <p className={`mt-3 text-xs font-bold ${state === 'yes' ? 'text-emerald-600' : 'text-slate-500'}`}>
                {state === 'yes' ? `✓ ${t(language, 'his.st.executed')}` : state === 'expired' ? `⏱ ${t(language, 'his.st.pending_confirmation')}` : `✕ ${t(language, 'his.st.cancelled')}`}
              </p>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => confirm(false, res)} className="h-12 rounded-2xl border border-slate-300 bg-white text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer">
                    <X className="w-4 h-4 text-rose-500" /> {L.ui.cancel}
                  </button>
                  <button onClick={() => confirm(true, res)} className="h-12 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 cursor-pointer">
                    <Check className="w-4 h-4" /> {L.ui.yesSave}
                  </button>
                </div>
                {handsFree && <p className="mt-2 text-center text-[11px] text-indigo-600 font-semibold">🎙 {L.ui.orSay}</p>}
              </>
            )}
          </div>
        );
      }

      case 'signature': {
        const s = m.sig!;
        return (
          <div className="mt-2 rounded-3xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              {L.ui.signTitle}
            </div>
            {s.status !== 'done' && (
              <>
                <p className="mt-2 text-[11px] text-slate-500">{L.ui.signHint}</p>
                <p className="mt-1 text-base font-bold text-slate-900 leading-snug">“{s.request.phrase}”</p>
              </>
            )}

            {s.status === 'ask' && (
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <button onClick={() => captureSignature(m.id, s.request)} className="h-12 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-95 cursor-pointer">
                  <Mic className="w-4 h-4" /> {L.ui.recordVoice}
                </button>
                <button onClick={() => skipSignature(m.id)} className="h-12 px-4 rounded-2xl border border-slate-300 text-slate-600 font-semibold text-sm cursor-pointer">
                  {L.ui.skip}
                </button>
              </div>
            )}
            {s.status === 'recording' && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-12 rounded-2xl bg-emerald-600/10 flex items-center justify-center gap-1 px-3">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full bg-emerald-600 transition-all duration-75"
                      style={{ height: `${10 + recorder.level * 90 * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.3 + recorder.elapsedMs / 120)))}%` }}
                    />
                  ))}
                </div>
                <button onClick={recorder.stop} className="h-12 px-4 rounded-2xl bg-rose-600 text-white font-bold text-sm flex items-center gap-1.5 cursor-pointer">
                  <Square className="w-3.5 h-3.5" /> {(recorder.elapsedMs / 1000).toFixed(1)}s
                </button>
              </div>
            )}
            {s.status === 'saving' && (
              <p className="mt-3 text-sm text-emerald-800 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Sealing…
              </p>
            )}
            {s.status === 'done' && s.signature && (
              <div className="mt-3 space-y-2">
                <ProofPlayer signature={s.signature} label={`${s.request.customer_name} · ${L.ui.signed}`} />
                <button onClick={() => share(s.signature!)} className="w-full h-11 rounded-2xl border border-emerald-300 text-emerald-800 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer">
                  <Share2 className="w-4 h-4" /> {L.ui.shareProof}
                </button>
              </div>
            )}
            {s.status === 'skipped' && <p className="mt-2 text-xs text-slate-400">—</p>}
            {s.status === 'error' && (
              <div className="mt-3 flex items-center gap-2">
                <p className="flex-1 text-xs text-rose-600">{s.error}</p>
                <button onClick={() => captureSignature(m.id, s.request)} className="h-10 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                  <RotateCcw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            )}
          </div>
        );
      }

      case 'khata': {
        const k = m.khata!;
        const tone = balanceTone(k.balance);
        return (
          <div className="mt-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-black text-slate-900 flex items-center gap-1.5 min-w-0">
                <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">{k.customer_name}</span>
              </p>
              <div className="text-right">
                <p className={`text-2xl font-black leading-none ${tone.cls}`}>{formatINR(k.balance)}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">{tone.label}</p>
              </div>
            </div>
            {k.recent && k.recent.length > 0 && (
              <div className="mt-3 rounded-2xl bg-slate-50 divide-y divide-slate-100 text-xs">
                {k.recent.map((e) => (
                  <div key={e.id} className="flex justify-between px-3 py-1.5">
                    <span className="text-slate-500">{e.created_at.slice(0, 10)}</span>
                    <span className={`font-bold ${e.entry_type === 'credit' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {e.entry_type === 'credit' ? '+' : '−'}
                      {formatINR(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {k.proofs && k.proofs.length > 0 && (
              <div className="mt-3">
                <ProofPlayer signature={k.proofs[0]} compact />
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {k.entry_type === 'payment' && k.amount ? (
                <button onClick={() => openWhatsApp(k.phone, paymentReceiptMessage(k.customer_name, k.amount!, k.balance, language))} className="h-11 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                  <MessageCircle className="w-4 h-4" /> {L.ui.sendReceipt}
                </button>
              ) : k.balance > 0 ? (
                <button onClick={() => openWhatsApp(k.phone, paymentReminderMessage(k.customer_name, k.balance, language))} className="h-11 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                  <MessageCircle className="w-4 h-4" /> {L.ui.sendReminder}
                </button>
              ) : (
                <span />
              )}
              {onOpenKhata && (
                <button onClick={onOpenKhata} className="h-11 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                  <BookOpen className="w-4 h-4" /> {L.ui.openKhata}
                </button>
              )}
            </div>
          </div>
        );
      }

      case 'proof':
        return (
          <div className="mt-2 rounded-3xl border-2 border-emerald-300 bg-white p-4 shadow-sm space-y-2">
            <p className="font-black text-emerald-900 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> {L.ui.proofTitle}
            </p>
            {m.proofs!.map((p, i) => (
              <ProofPlayer key={p.id} ref={(h) => { proofRefs.current[`${m.id}_${i}`] = h; }} signature={p} />
            ))}
            <button onClick={() => share(m.proofs![0], m.khata?.phone)} className="w-full h-11 rounded-2xl border border-emerald-300 text-emerald-800 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer">
              <Share2 className="w-4 h-4" /> {L.ui.shareProof}
            </button>
          </div>
        );

      case 'dues':
        return (
          <div className="mt-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase">{L.ui.outstanding}</p>
              <p className="text-xl font-black text-rose-600">{formatINR(m.dues!.total_outstanding)}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {m.dues!.top.map((a) => (
                <div key={a.customer_id} className="flex items-center justify-between py-2 gap-2">
                  <span className="font-bold text-slate-900 text-sm truncate">{a.customer_name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-rose-600 text-sm">{formatINR(a.balance)}</span>
                    <button onClick={() => openWhatsApp(a.phone, paymentReminderMessage(a.customer_name, a.balance, language))} aria-label={`${L.ui.sendReminder} ${a.customer_name}`} className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center cursor-pointer">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'hisaab': {
        const h = m.hisaab!;
        return (
          <div className="mt-2 rounded-3xl border border-indigo-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-indigo-700 uppercase flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-4 h-4" /> {L.ui.todayHisaab}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [L.ui.sales, h.total_revenue, 'text-slate-900'],
                [L.ui.collected, h.collected_today, 'text-emerald-600'],
                [L.ui.udharGiven, h.udhar_given_today, 'text-rose-600'],
              ].map(([label, val, cls]) => (
                <div key={label as string} className="rounded-2xl bg-slate-50 p-2">
                  <p className="text-[10px] text-slate-500">{label}</p>
                  <p className={`text-sm font-black ${cls}`}>{formatINR(Number(val || 0))}</p>
                </div>
              ))}
            </div>
            {h.chase?.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold text-slate-500 mb-1">{L.ui.chaseTomorrow}</p>
                {h.chase.map((c: any) => (
                  <div key={c.customer_name} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="font-semibold text-slate-800">{c.customer_name}</span>
                    <button onClick={() => openWhatsApp(c.phone, paymentReminderMessage(c.customer_name, c.balance, language))} className="flex items-center gap-1 text-rose-600 font-black cursor-pointer">
                      {formatINR(c.balance)} <MessageCircle className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'alerts':
        return (
          <div className="mt-2 rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <button
              onClick={async () => {
                await askNotificationPermission();
                patch(m.id, (x) => ({ ...x, kind: undefined, text: t(language, 'rem.alertsOn') }));
              }}
              className="w-full h-12 rounded-2xl bg-amber-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              🔔 {t(language, 'rem.allowBtn')}
            </button>
          </div>
        );

      case 'receipt': {
        const r = m.receipt!;
        return (
          <div className="mt-2 rounded-3xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm font-mono text-xs">
            <p className="text-center font-bold text-slate-900 text-sm font-sans">{SHOP_NAME.toUpperCase()}</p>
            <p className="text-center text-[10px] text-slate-400 mb-2">#{String(r.order_id || '').toUpperCase()}</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Customer</span><b>{r.customer_name}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Item</span><span>{r.quantity} × {r.product_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Payment</span><b className={r.payment_mode === 'udhar' ? 'text-amber-700' : 'text-emerald-700'}>{r.payment_mode === 'udhar' ? 'UDHAR' : 'PAID'}</b></div>
              <div className="flex justify-between border-t border-amber-200 pt-1 text-sm font-black"><span>TOTAL</span><span>{formatINR(r.total_amount)}</span></div>
            </div>
            <button
              onClick={() =>
                openWhatsApp(r.phone, `*${SHOP_NAME}*\n${r.customer_name}\n${r.quantity} × ${r.product_name}\nTotal: ${formatINR(r.total_amount)} (${r.payment_mode === 'udhar' ? 'udhar' : 'paid'})\n🙏`)
              }
              className="mt-3 w-full h-11 rounded-2xl bg-emerald-600 text-white font-sans font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" /> {L.ui.sendBill}
            </button>
          </div>
        );
      }
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------- layout
  const orbClass =
    phase === 'recording'
      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/50'
      : phase === 'listening'
        ? awaiting === 'confirm'
          ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/50'
          : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/50'
        : phase === 'thinking'
          ? 'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-indigo-500/40'
          : 'bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 shadow-indigo-500/50';

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-slate-50 to-indigo-50/40">
      {/* Top bar */}
      <div className="shrink-0 px-3 pt-[max(env(safe-area-inset-top),10px)] pb-2 bg-white/85 backdrop-blur border-b border-slate-200/70">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shadow-md ${orbClass}`}>V</div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 leading-tight">Vaani</p>
            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${phase === 'idle' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              {phase === 'idle' ? `${SHOP_NAME} · ${L.ui.ready}` : status}
            </p>
          </div>
          <div className="flex md:hidden rounded-xl bg-slate-100 p-0.5" role="group" aria-label="Language">
            {LANG_ORDER.map((code) => (
              <button
                key={code}
                onClick={() => onLanguageChange(code)}
                aria-pressed={language === code}
                className={`min-w-9 h-8 px-2 rounded-lg text-xs font-bold cursor-pointer ${language === code ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
              >
                {LANGS[code].short}
              </button>
            ))}
          </div>
          <button onClick={newChat} aria-label="New conversation" title="New conversation" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer">
            <MessageSquarePlus className="w-5 h-5" />
          </button>
          <button onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute' : 'Mute'} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.from === 'me' ? 'items-end' : 'items-start'}`}>
              {m.kind !== 'signature' && (
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-3xl text-[15px] leading-snug ${
                    m.from === 'me' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white text-slate-800 rounded-bl-md shadow-sm border border-slate-100'
                  }`}
                >
                  {m.text}
                </div>
              )}
              {m.kind && <div className="w-full max-w-[min(100%,26rem)]">{renderCard(m)}</div>}
            </div>
          ))}

          {phase === 'listening' && interimTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[85%] px-4 py-2.5 rounded-3xl rounded-br-md bg-indigo-100 text-indigo-900 text-[15px] italic">{interimTranscript}</div>
            </div>
          )}
          {thinking && (
            <div className="flex">
              <div className="px-4 py-3 rounded-3xl rounded-bl-md bg-white shadow-sm border border-slate-100 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={feedEndRef} />
        </div>
      </div>

      {/* Dock */}
      <div className="shrink-0 bg-white/90 backdrop-blur border-t border-slate-200/70 pt-2 pb-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 overflow-x-auto px-3 pb-2 no-scrollbar">
            {L.chips.map((c) => (
              <button key={c.text} onClick={() => runChip(c.text)} className="shrink-0 h-9 px-3.5 rounded-full border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 active:bg-indigo-50 cursor-pointer">
                {c.label}
              </button>
            ))}
          </div>

          {errorText && (
            <p className="mx-3 mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errorText}
            </p>
          )}

          {keyboardOpen && (
            <div className="mx-3 mb-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3">
              <input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
                placeholder={hasPending ? L.ui.typeYesNo : L.ui.typeHere}
                className="flex-1 h-12 bg-transparent text-[15px] focus:outline-none"
                aria-label="Type a command"
              />
              <button onClick={submitTyped} aria-label="Send" className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="px-6 flex items-center justify-between">
            <button onClick={() => setKeyboardOpen(!keyboardOpen)} aria-label="Keyboard" className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer ${keyboardOpen ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
              <Keyboard className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center">
              <button
                onClick={onOrb}
                aria-label={status}
                className={`relative w-20 h-20 rounded-full text-white flex items-center justify-center shadow-2xl transition-transform active:scale-95 cursor-pointer ${orbClass}`}
                style={phase === 'recording' ? { transform: `scale(${1 + recorder.level * 0.25})` } : undefined}
              >
                {(phase === 'listening' || phase === 'recording') && <span className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping" />}
                {phase === 'thinking' ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : phase === 'listening' || phase === 'recording' ? (
                  <Square className="w-7 h-7 fill-white" />
                ) : phase === 'speaking' ? (
                  <span className="flex items-end gap-1 h-8">
                    {[0.1, 0.3, 0.5, 0.2, 0.4].map((d, i) => (
                      <span key={i} className="w-1.5 h-full bg-white rounded-full soundwave-bar" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </span>
                ) : (
                  <Mic className="w-9 h-9" />
                )}
              </button>
              <p className="mt-1.5 text-[11px] font-semibold text-slate-500 h-4">{status}</p>
            </div>

            <button
              onClick={() => setHandsFree(!handsFree)}
              aria-label={L.ui.handsFree}
              aria-pressed={handsFree}
              className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center cursor-pointer ${handsFree ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
            >
              <Hand className="w-5 h-5" />
              <span className="text-[8px] font-bold leading-none mt-0.5">{handsFree ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
