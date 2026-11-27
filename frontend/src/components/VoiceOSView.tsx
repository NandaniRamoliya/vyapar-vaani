import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  Store,
  TrendingUp,
  AlertCircle,
  Zap,
  Check,
  X,
  BookOpen,
  Hand,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LanguageCode, VoiceProcessResult } from '../types';
import { useVoice } from '../hooks/useVoice';
import { api } from '../services/api';
import { playSoundboxChime } from '../utils/soundboxChime';
import { classifyConfirmation } from '../utils/confirmWords';
import {
  SHOP_NAME,
  dueAgeLabel,
  formatINR,
  openWhatsApp,
  paymentReminderMessage,
  paymentReceiptMessage,
} from '../utils/whatsapp';

interface VoiceOSViewProps {
  language?: LanguageCode;
  onLanguageChange?: (lang: LanguageCode) => void;
  onRefreshData?: () => void;
  onOpenKhata?: () => void;
}

interface ReceiptData {
  id?: string;
  customer_name: string;
  phone?: string;
  product_name: string;
  quantity: number;
  total_amount: number;
  payment_mode: 'paid' | 'udhar';
  khata_balance?: number | null;
  created_at: string;
}

interface KhataCardData {
  customer_name: string;
  phone?: string;
  balance: number;
  entry_type?: 'credit' | 'payment';
  amount?: number;
  last_payment_at?: string | null;
  recent_entries?: { id: string; entry_type: 'credit' | 'payment'; amount: number; created_at: string; note?: string }[];
}

interface DuesData {
  total_outstanding: number;
  customers_with_dues: number;
  top: {
    customer_id: string;
    customer_name: string;
    phone: string;
    balance: number;
    days_since_payment: number | null;
    never_paid?: boolean;
  }[];
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  type?: 'order_receipt' | 'confirmation_card' | 'stats_summary' | 'khata_card' | 'dues_list' | 'general';
  receipt?: ReceiptData;
  khata?: KhataCardData;
  dues?: DuesData;
  statsData?: any;
  pendingResult?: VoiceProcessResult;
  timestamp: string;
}

const CONFIRM_SILENCE_MS = 1300;
const KHATA_INTENTS = ['add_udhar', 'record_payment'];

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const VoiceOSView: React.FC<VoiceOSViewProps> = ({ onRefreshData, onOpenKhata }) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text:
        'Namaste! I am your VyaparVaani voice assistant. Speak an order ("Add an order for Rahul. 20 shirts, total 15000 rupees"), ' +
        'write udhar ("Rahul ko 5000 udhar likho") or record a payment ("Rahul paid 3000"). ' +
        'I read the details back, and you can simply say "Yes" or "Haan" to save, no need to touch the screen.',
      timestamp: 'Just now',
    },
  ]);

  const [stage, setStage] = useState<'idle' | 'listening' | 'processing' | 'confirming'>('idle');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [handsFree, setHandsFree] = useState(true);
  const [awaitingVoiceReply, setAwaitingVoiceReply] = useState(false);
  const [resolved, setResolved] = useState<Record<string, 'executed' | 'cancelled'>>({});
  const [manualText, setManualText] = useState('');

  const isProcessingRef = useRef(false);
  const handledIdsRef = useRef<Set<string>>(new Set());
  // The confirmation currently waiting for a yes/no; read inside async speech callbacks.
  const awaitingConfirmRef = useRef<VoiceProcessResult | null>(null);
  const confirmRetryRef = useRef(0);
  const ttsRef = useRef(ttsEnabled);
  const handsFreeRef = useRef(handsFree);
  const feedEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ttsRef.current = ttsEnabled;
    handsFreeRef.current = handsFree;
  }, [ttsEnabled, handsFree]);

  const pushMessage = (m: Omit<MessageItem, 'id' | 'timestamp'>) =>
    setMessages((prev) => [
      ...prev,
      { ...m, id: `${m.sender[0]}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, timestamp: nowTime() },
    ]);

  // Routes every finished utterance: a reply to a pending confirmation, or a fresh command.
  const handleFinalSpeech = (spokenText: string) => {
    const text = spokenText.trim();
    if (!text) return;
    const pending = awaitingConfirmRef.current;
    if (pending) {
      handleVoiceReply(text, pending);
    } else {
      executeVoiceCommand(text);
    }
  };

  const {
    isListening,
    transcript,
    interimTranscript,
    isSpeaking,
    error: voiceError,
    startListening,
    stopListening,
    cancelListening,
    speak,
    stopSpeaking,
  } = useVoice({
    language: 'en-IN',
    onFinalTranscript: handleFinalSpeech,
  });

  // Synchronize stage with listening state
  useEffect(() => {
    if (isListening) {
      setStage('listening');
    } else {
      setAwaitingVoiceReply(false);
      if (stage === 'listening') setStage(awaitingConfirmRef.current ? 'confirming' : 'idle');
    }
  }, [isListening, stage]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const say = (text: string, onEnd?: () => void) => {
    if (ttsRef.current && text) {
      speak(text, 'en-IN', onEnd);
    } else {
      onEnd?.();
    }
  };

  // Opens the mic for a short "yes / no" reply, but only if that same confirmation is still pending.
  const listenForConfirmation = (result: VoiceProcessResult) => {
    if (!handsFreeRef.current) return;
    if (awaitingConfirmRef.current?.interaction_id !== result.interaction_id) return;
    setAwaitingVoiceReply(true);
    startListening({ silenceMs: CONFIRM_SILENCE_MS });
  };

  // Quietly cancel a pending confirmation when the merchant moves on to a new command.
  const dropPendingConfirmation = () => {
    const pending = awaitingConfirmRef.current;
    if (!pending) return;
    awaitingConfirmRef.current = null;
    handledIdsRef.current.add(pending.interaction_id);
    setResolved((r) => ({ ...r, [pending.interaction_id]: 'cancelled' }));
    api.confirmVoiceAction(pending.interaction_id, false).catch(() => {});
  };

  const handleVoiceReply = (text: string, pending: VoiceProcessResult) => {
    const verdict = classifyConfirmation(text);
    if (verdict) {
      pushMessage({ sender: 'user', text });
      handleConfirm(verdict === 'yes', pending);
      return;
    }

    // Not a yes/no. A longer sentence is a new command; a short mumble gets one re-ask.
    if (text.split(/\s+/).length >= 3) {
      dropPendingConfirmation();
      executeVoiceCommand(text);
      return;
    }

    pushMessage({ sender: 'user', text });
    if (confirmRetryRef.current < 1) {
      confirmRetryRef.current += 1;
      const ask = 'Sorry, should I save it? Please say yes to save, or no to cancel.';
      pushMessage({ sender: 'assistant', text: ask });
      say(ask, () => listenForConfirmation(pending));
    } else {
      pushMessage({ sender: 'assistant', text: 'No problem, tap "Yes, Save" or "Cancel" on the card when you are ready.' });
    }
  };

  const executeVoiceCommand = async (rawText: string) => {
    const clean = rawText ? rawText.trim() : '';
    if (!clean || isProcessingRef.current) return;
    isProcessingRef.current = true;

    pushMessage({ sender: 'user', text: clean });
    setStage('processing');

    try {
      // Parse without auto_execute so the merchant always verifies before anything is saved
      const result = await api.processVoice(clean, 'en-IN', false);

      if (result.confirmation_required) {
        setStage('confirming');
        awaitingConfirmRef.current = result;
        confirmRetryRef.current = 0;

        const promptText = result.confirmation_prompt || 'Should I save this?';
        pushMessage({ sender: 'assistant', text: promptText, type: 'confirmation_card', pendingResult: result });
        // Hands-free: once the prompt has been read out, listen for "yes" / "haan" / "no"
        say(promptText, () => listenForConfirmation(result));
        return;
      }

      setStage('idle');
      say(result.spoken_response);
      const data = result.extracted_data;

      if (result.intent === 'show_business_summary') {
        pushMessage({ sender: 'assistant', text: result.spoken_response, type: 'stats_summary', statsData: data.stats });
      } else if (result.intent === 'check_balance' && data.found) {
        pushMessage({
          sender: 'assistant',
          text: result.spoken_response,
          type: 'khata_card',
          khata: {
            customer_name: data.customer_name || "",
            phone: data.phone,
            balance: data.balance,
            last_payment_at: data.last_payment_at,
            recent_entries: data.recent_entries,
          },
        });
      } else if (result.intent === 'list_dues' && data.khata_summary) {
        pushMessage({ sender: 'assistant', text: result.spoken_response, type: 'dues_list', dues: data.khata_summary });
      } else {
        pushMessage({ sender: 'assistant', text: result.spoken_response });
      }
      onRefreshData?.();
    } catch (err: any) {
      console.error(err);
      setStage('idle');
      pushMessage({
        sender: 'assistant',
        text: 'Sorry, I did not catch that clearly. Please try again or tap one of the quick chips below.',
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Typed text and chips behave like speech: they answer a pending confirmation or start fresh.
  const submitText = (text: string) => handleFinalSpeech(text);
  const runChip = (text: string) => {
    dropPendingConfirmation();
    executeVoiceCommand(text);
  };

  const handleConfirm = async (confirmed: boolean, target: VoiceProcessResult) => {
    if (handledIdsRef.current.has(target.interaction_id)) return;
    handledIdsRef.current.add(target.interaction_id);
    // Clear the pending ref first so the interrupted prompt's onEnd does not reopen the mic
    if (awaitingConfirmRef.current?.interaction_id === target.interaction_id) {
      awaitingConfirmRef.current = null;
    }
    cancelListening();
    stopSpeaking();
    setStage('processing');
    setResolved((r) => ({ ...r, [target.interaction_id]: confirmed ? 'executed' : 'cancelled' }));

    try {
      const response = await api.confirmVoiceAction(target.interaction_id, confirmed);
      setStage('idle');

      if (!confirmed) {
        say(response.spoken_response);
        pushMessage({ sender: 'assistant', text: 'Cancelled. Nothing was saved. Speak again whenever you are ready.' });
        return;
      }

      playSoundboxChime();
      if (target.intent === 'create_order' || target.intent === 'record_payment') {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
      say(response.spoken_response);

      const r = response.executed_result || {};
      if (target.intent === 'create_order') {
        pushMessage({
          sender: 'assistant',
          text: response.spoken_response,
          type: 'order_receipt',
          receipt: {
            id: r.order_id,
            customer_name: r.customer_name,
            phone: r.phone,
            product_name: r.product_name,
            quantity: r.quantity,
            total_amount: r.total_amount,
            payment_mode: r.payment_mode === 'udhar' ? 'udhar' : 'paid',
            khata_balance: r.khata_balance,
            created_at: new Date().toLocaleDateString('en-IN'),
          },
        });
      } else if (KHATA_INTENTS.includes(target.intent)) {
        pushMessage({
          sender: 'assistant',
          text: response.spoken_response,
          type: 'khata_card',
          khata: {
            customer_name: r.customer_name,
            phone: r.phone,
            balance: r.balance,
            entry_type: r.entry_type,
            amount: r.amount,
          },
        });
      } else {
        pushMessage({ sender: 'assistant', text: response.spoken_response || 'Saved successfully!' });
      }
      onRefreshData?.();
    } catch (e: any) {
      console.error(e);
      setStage('idle');
      pushMessage({ sender: 'assistant', text: e?.message || 'Could not complete that action. Please try again.' });
    }
  };

  const handleSendBill = (o: ReceiptData) => {
    const text =
      `*${SHOP_NAME.toUpperCase()} - BILL*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Customer: ${o.customer_name}\n` +
      `Item: ${o.product_name}\n` +
      `Quantity: ${o.quantity} units\n` +
      `Total: ${formatINR(o.total_amount)}\n` +
      `Payment: ${o.payment_mode === 'udhar' ? 'On khata (udhar)' : 'Paid'}\n` +
      (o.payment_mode === 'udhar' && o.khata_balance != null ? `Khata balance: ${formatINR(o.khata_balance)}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Thank you for doing business with us!`;
    openWhatsApp(o.phone, text);
  };

  const handleUndoOrder = async (orderId?: string) => {
    if (!orderId) return;
    try {
      await api.deleteOrder(orderId);
      onRefreshData?.();
      pushMessage({ sender: 'assistant', text: 'Order undone. It was removed from orders and from the khata.' });
    } catch (_) {
      pushMessage({ sender: 'assistant', text: 'Could not undo that order. Please remove it from the Orders tab.' });
    }
  };

  const presetChips = [
    { label: '👕 Add order for Rahul (₹15,000)', text: 'Add an order for Rahul. 20 shirts, total 15000 rupees.' },
    { label: '📒 Order for Priya on udhar', text: 'Add an order for Priya. 10 sarees, total 12000 rupees on udhar.' },
    { label: '🧾 Rahul ka kitna baaki hai?', text: 'How much does Rahul owe me?' },
    { label: '💵 Rahul paid ₹3,000', text: 'Rahul paid 3000 rupees' },
    { label: '✍️ Anjali ko 2000 udhar likho', text: 'Anjali ko 2000 udhar likho' },
    { label: '👥 Who owes me money?', text: 'Who owes me money?' },
    { label: '💰 How much did I sell today?', text: 'How much did I sell today?' },
    { label: '⏰ Remind me to collect from Rahul', text: 'Remind me to collect payment from Rahul tomorrow at 11 AM' },
  ];

  const renderConfirmRows = (res: VoiceProcessResult) => {
    const d = res.extracted_data;
    const row = (label: string, value: React.ReactNode, strong = false) => (
      <div className="flex justify-between gap-3">
        <span className="text-slate-500 shrink-0">{label}</span>
        <span className={`text-right ${strong ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>{value}</span>
      </div>
    );

    if (res.intent === 'create_order') {
      return (
        <>
          {row('Customer:', d.customer_name, true)}
          {row('Item:', d.product_name)}
          {row('Quantity:', `${d.quantity} Units`)}
          {row(
            'Payment:',
            d.payment_mode === 'udhar' ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">Udhar · added to khata</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Paid</span>
            ),
          )}
          <div className="flex justify-between pt-1 border-t border-indigo-200 text-sm font-black text-slate-900">
            <span>Total Amount:</span>
            <span className="text-indigo-700">{formatINR(Number(d.total_amount || 0))}</span>
          </div>
        </>
      );
    }
    if (KHATA_INTENTS.includes(res.intent)) {
      const isCredit = res.intent === 'add_udhar';
      return (
        <>
          {row(
            'Customer:',
            <>
              {d.customer_name}
              {d.is_new_customer && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[9px] font-bold align-middle">NEW</span>
              )}
            </>,
            true,
          )}
          {row('Entry:', isCredit ? 'Udhar given (credit)' : 'Payment received (jama)')}
          {row(
            'Amount:',
            <span className={isCredit ? 'text-rose-700 font-black' : 'text-emerald-700 font-black'}>
              {isCredit ? '+' : '−'}
              {formatINR(Number(d.amount || 0))}
            </span>,
          )}
          <div className="flex justify-between items-center pt-1 border-t border-indigo-200 text-sm font-black text-slate-900">
            <span>Khata balance:</span>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400 line-through decoration-1">{formatINR(Number(d.current_balance || 0))}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-indigo-700">{formatINR(Number(d.new_balance || 0))}</span>
            </span>
          </div>
        </>
      );
    }
    if (res.intent === 'create_reminder') {
      return (
        <>
          {row('Task:', d.title, true)}
          {row('Date:', d.reminder_date)}
          {row('Time:', d.reminder_time)}
        </>
      );
    }
    if (res.intent === 'add_customer') {
      return (
        <>
          {row('Name:', d.name, true)}
          {row('Phone:', d.phone)}
        </>
      );
    }
    return <p className="text-slate-600">{res.confirmation_prompt}</p>;
  };

  const confirmTitle = (intent: string) =>
    ({
      create_order: 'Please Confirm Order Details',
      add_udhar: 'Confirm Udhar Entry',
      record_payment: 'Confirm Payment Received',
      create_reminder: 'Confirm Reminder',
      add_customer: 'Confirm New Customer',
    })[intent] || 'Please Confirm';

  const balanceTone = (balance: number) =>
    balance > 0
      ? { label: 'Balance due', cls: 'text-rose-700' }
      : balance === 0
        ? { label: 'Settled', cls: 'text-emerald-700' }
        : { label: 'Advance', cls: 'text-sky-700' };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-4">
      {/* Top Merchant Status Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-slate-900 text-sm tracking-tight">{SHOP_NAME}</h2>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Zap className="w-3 h-3 text-indigo-600" />
                <span>Verified Voice Confirmation</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">Surat Wholesale Market • Orders + Khata by Voice</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setHandsFree(!handsFree)}
            title="After reading a confirmation aloud, listen for a spoken yes / no"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              handsFree
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Hands-free {handsFree ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? 'Mute Soundbox Voice' : 'Unmute Soundbox Voice'}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer"
          >
            {ttsEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Voice ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>Muted</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hero Soundbox Voice Orb Centerpiece */}
      <div className="bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col items-center justify-center shrink-0 min-h-[200px]">
        <div className="absolute top-0 w-64 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 mb-3">
          {stage === 'listening' ? (
            <div className="relative">
              <div
                className={`absolute inset-0 rounded-full animate-pulse-ring scale-150 ${
                  awaitingVoiceReply ? 'bg-emerald-500/30' : 'bg-red-500/30'
                }`}
              />
              <button
                onClick={stopListening}
                className={`relative z-10 w-24 h-24 rounded-full text-white flex items-center justify-center shadow-2xl cursor-pointer animate-pulse ${
                  awaitingVoiceReply
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/50'
                    : 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-red-500/50'
                }`}
              >
                <MicOff className="w-10 h-10" />
              </button>
            </div>
          ) : stage === 'processing' ? (
            <div className="w-24 h-24 rounded-full bg-indigo-900 border-2 border-indigo-400 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <Sparkles className="w-10 h-10 text-indigo-300 animate-spin" />
            </div>
          ) : (
            <button
              onClick={() => startListening()}
              className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            >
              <Mic className="w-10 h-10 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>

        {(stage === 'listening' || isSpeaking) && (
          <div className="flex items-center space-x-1.5 mb-2 z-10">
            <div className="w-1.5 h-4 bg-indigo-400 rounded-full soundwave-bar" style={{ animationDelay: '0.1s' }} />
            <div className="w-1.5 h-7 bg-indigo-300 rounded-full soundwave-bar" style={{ animationDelay: '0.3s' }} />
            <div className="w-1.5 h-5 bg-indigo-500 rounded-full soundwave-bar" style={{ animationDelay: '0.5s' }} />
            <div className="w-1.5 h-8 bg-indigo-200 rounded-full soundwave-bar" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-4 bg-indigo-400 rounded-full soundwave-bar" style={{ animationDelay: '0.4s' }} />
          </div>
        )}

        <div className="text-center z-10 max-w-lg px-4">
          {stage === 'listening' && awaitingVoiceReply ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-300 font-bold mb-1">Hands-free confirmation</p>
              <h3 className="text-lg font-bold text-white min-h-[30px]">
                {interimTranscript || transcript || 'Say “Yes” / “Haan” to save, or “No” to cancel'}
              </h3>
            </div>
          ) : stage === 'listening' ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-rose-300 font-bold mb-1">Listening (2s pause detection)...</p>
              <h3 className="text-lg font-bold text-white min-h-[30px]">
                {interimTranscript || transcript || 'Speak your order or khata entry now...'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Pausing for 2 seconds will finalize your speech</p>
            </div>
          ) : stage === 'processing' ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-indigo-300 font-bold mb-1">Analyzing Speech...</p>
              <h3 className="text-lg font-bold text-white">Extracting customer, items, and amount...</h3>
            </div>
          ) : stage === 'confirming' ? (
            <div>
              <h3 className="text-base md:text-lg font-bold text-white">Waiting for your confirmation</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {handsFree ? 'Tap the mic and say “Yes” or “No”, or use the card below' : 'Use the buttons on the card below'}
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-base md:text-lg font-bold text-white">Tap microphone to speak</h3>
              <p className="text-xs text-slate-400 mt-0.5">Try: "Rahul ko 5000 udhar likho" or "How much does Priya owe me?"</p>
            </div>
          )}

          {voiceError && (
            <div className="mt-3 p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-center space-x-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{voiceError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Fast-Voice Action Chips */}
      <div className="shrink-0">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">One-Click Instant Voice Prompts:</p>
        <div className="flex flex-wrap gap-2">
          {presetChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => runChip(chip.text)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50/80 hover:border-indigo-300 text-xs font-semibold text-slate-800 transition-all cursor-pointer flex items-center space-x-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Timeline Feed */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-6 overflow-y-auto space-y-4 min-h-[300px] shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Voice Activity Feed</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">Live</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Automatic Bharat Ledger</span>
        </div>

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
          >
            <div
              className={`max-w-md px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                  : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'
              }`}
            >
              <p>{m.text}</p>
              <span className={`block text-[9px] mt-1 text-right ${m.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                {m.timestamp}
              </span>
            </div>

            {/* CONFIRMATION CARD */}
            {m.type === 'confirmation_card' && m.pendingResult && (() => {
              const res = m.pendingResult;
              const state = resolved[res.interaction_id];
              return (
                <div
                  className={`mt-3 w-full max-w-sm border-2 rounded-2xl p-4 text-xs font-sans shadow-md animate-in zoom-in-95 ${
                    state ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-indigo-50/90 border-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-200">
                    <div className="flex items-center space-x-1.5 text-indigo-900 font-bold">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>{confirmTitle(res.intent)}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        state === 'executed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : state === 'cancelled'
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-indigo-200/60 text-indigo-800'
                      }`}
                    >
                      {state === 'executed' ? 'Saved' : state === 'cancelled' ? 'Cancelled' : 'Awaiting You'}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-3 text-slate-700">{renderConfirmRows(res)}</div>

                  {!state && (
                    <>
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => handleConfirm(false, res)}
                          className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5 text-red-500" />
                          <span>Cancel</span>
                        </button>
                        <button
                          onClick={() => handleConfirm(true, res)}
                          className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{res.intent === 'create_order' ? 'Yes, Save Order' : 'Yes, Save'}</span>
                        </button>
                      </div>
                      {handsFree && (
                        <p className="mt-2 text-center text-[10px] text-indigo-700/80 font-semibold flex items-center justify-center gap-1">
                          <Mic className="w-3 h-3" />
                          Or just say “Yes” / “Haan”, or “No” to cancel
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            {/* KACCHA BILL RECEIPT */}
            {m.type === 'order_receipt' && m.receipt && (
              <div className="mt-3 w-full max-w-sm bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs font-mono shadow-md relative overflow-hidden animate-in zoom-in-95">
                <div className="text-center pb-3 border-b border-amber-200 mb-3">
                  <div className="flex items-center justify-center space-x-1.5 text-slate-900 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{SHOP_NAME.toUpperCase()}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans">Surat Wholesale Market • Verified Order Slip</p>
                  <p className="text-[10px] text-slate-400">
                    Slip #{(m.receipt.id || '').toUpperCase()} • {m.receipt.created_at}
                  </p>
                </div>

                <div className="space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold text-slate-900">{m.receipt.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Item:</span>
                    <span className="font-semibold">{m.receipt.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantity:</span>
                    <span className="font-bold">{m.receipt.quantity} Units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment:</span>
                    <span className={`font-bold ${m.receipt.payment_mode === 'udhar' ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {m.receipt.payment_mode === 'udhar' ? 'UDHAR (KHATA)' : 'PAID'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-amber-200 text-sm font-black text-slate-900">
                    <span>TOTAL:</span>
                    <span className="text-emerald-700">{formatINR(Number(m.receipt.total_amount || 0))}</span>
                  </div>
                  {m.receipt.payment_mode === 'udhar' && m.receipt.khata_balance != null && (
                    <div className="flex justify-between text-[11px] text-rose-700 font-bold">
                      <span>Khata balance now:</span>
                      <span>{formatINR(m.receipt.khata_balance)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleSendBill(m.receipt!)}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send Bill on WhatsApp</span>
                  </button>
                  {m.receipt.id && (
                    <button
                      onClick={() => handleUndoOrder(m.receipt?.id)}
                      className="w-full text-center text-[11px] text-slate-400 hover:text-red-600 font-sans cursor-pointer py-1"
                    >
                      Cancel / Undo this order
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* KHATA CARD: balance after an entry or a balance query */}
            {m.type === 'khata_card' && m.khata && (() => {
              const k = m.khata;
              const tone = balanceTone(k.balance);
              const isPaymentEntry = k.entry_type === 'payment' && k.amount;
              return (
                <div className="mt-3 w-full max-w-sm bg-white border-2 border-slate-200 rounded-2xl p-4 text-xs font-sans shadow-md animate-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                      <span>{k.customer_name} · Khata</span>
                    </div>
                    {k.entry_type && k.amount ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          k.entry_type === 'credit' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {k.entry_type === 'credit' ? `+${formatINR(k.amount)} udhar` : `−${formatINR(k.amount)} received`}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-end justify-between mb-3">
                    <span className="text-slate-500 font-semibold">{tone.label}</span>
                    <span className={`text-2xl font-black tracking-tight ${tone.cls}`}>{formatINR(k.balance)}</span>
                  </div>

                  {k.recent_entries && k.recent_entries.length > 0 && (
                    <div className="mb-3 rounded-xl bg-slate-50 border border-slate-100 divide-y divide-slate-100">
                      {k.recent_entries.map((e) => (
                        <div key={e.id} className="flex justify-between px-3 py-1.5">
                          <span className="text-slate-500">{e.created_at.slice(0, 10)}</span>
                          <span className={`font-bold ${e.entry_type === 'credit' ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {e.entry_type === 'credit' ? '+' : '−'}
                            {formatINR(e.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {isPaymentEntry ? (
                      <button
                        onClick={() => openWhatsApp(k.phone, paymentReceiptMessage(k.customer_name, k.amount!, k.balance))}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Send Payment Receipt on WhatsApp</span>
                      </button>
                    ) : k.balance > 0 ? (
                      <button
                        onClick={() => openWhatsApp(k.phone, paymentReminderMessage(k.customer_name, k.balance))}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Send Payment Reminder on WhatsApp</span>
                      </button>
                    ) : null}
                    {onOpenKhata && (
                      <button
                        onClick={onOpenKhata}
                        className="w-full text-center text-[11px] text-slate-500 hover:text-indigo-700 font-semibold cursor-pointer py-1"
                      >
                        Open full khata →
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* DUES LIST: "Who owes me money?" */}
            {m.type === 'dues_list' && m.dues && (
              <div className="mt-3 w-full max-w-sm bg-white border-2 border-slate-200 rounded-2xl p-4 text-xs font-sans shadow-md animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <span>Udhar Outstanding</span>
                  </div>
                  <span className="text-base font-black text-rose-700">{formatINR(m.dues.total_outstanding)}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {m.dues.top.map((a) => (
                    <div key={a.customer_id} className="flex items-center justify-between py-2 gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{a.customer_name}</p>
                        {a.days_since_payment != null && (
                          <p className={`text-[10px] ${a.days_since_payment > 30 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                            {dueAgeLabel(a.days_since_payment, a.never_paid)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-rose-700">{formatINR(a.balance)}</span>
                        <button
                          onClick={() => openWhatsApp(a.phone, paymentReminderMessage(a.customer_name, a.balance))}
                          title={`Send WhatsApp reminder to ${a.customer_name}`}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {onOpenKhata && (
                  <button
                    onClick={onOpenKhata}
                    className="mt-2 w-full text-center text-[11px] text-slate-500 hover:text-indigo-700 font-semibold cursor-pointer py-1"
                  >
                    Open khata book →
                  </button>
                )}
              </div>
            )}

            {/* SALES SUMMARY */}
            {m.type === 'stats_summary' && m.statsData && (
              <div className="mt-2 w-full max-w-sm bg-indigo-50/90 border border-indigo-200 rounded-2xl p-4 text-xs font-sans">
                <div className="flex items-center space-x-2 text-indigo-900 font-bold mb-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Today's Sales Breakdown</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                    <p className="text-[10px] text-slate-500">Sales</p>
                    <p className="text-sm font-black text-emerald-700">{formatINR(Number(m.statsData.total_revenue || 0))}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                    <p className="text-[10px] text-slate-500">Orders</p>
                    <p className="text-sm font-black text-slate-900">{m.statsData.total_orders || 0}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                    <p className="text-[10px] text-slate-500">Udhar collected</p>
                    <p className="text-sm font-black text-indigo-700">{formatINR(Number(m.statsData.collected_today || 0))}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={feedEndRef} />
      </div>

      {/* Typed fallback: behaves exactly like speech (including typing "yes" to confirm) */}
      <div className="p-2 bg-white rounded-2xl border border-slate-200 flex items-center space-x-2 shrink-0">
        <input
          type="text"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && manualText.trim()) {
              submitText(manualText);
              setManualText('');
            }
          }}
          placeholder={
            stage === 'confirming'
              ? 'Type "yes" to save or "no" to cancel...'
              : 'Or type: "Rahul paid 3000" · "Who owes me money?" · "Add an order for Rahul..."'
          }
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
        />
        <button
          onClick={() => {
            if (manualText.trim()) {
              submitText(manualText);
              setManualText('');
            }
          }}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
