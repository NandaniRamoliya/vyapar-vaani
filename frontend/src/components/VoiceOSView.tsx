import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  CheckCircle2, 
  MessageCircle, 
  Store, 
  ArrowRight, 
  IndianRupee, 
  Package, 
  User, 
  Clock, 
  Send,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Order, LanguageCode } from '../types';
import { useVoice } from '../hooks/useVoice';
import { api } from '../services/api';
import { playSoundboxChime } from '../utils/soundboxChime';

interface VoiceOSViewProps {
  language?: LanguageCode;
  onLanguageChange?: (lang: LanguageCode) => void;
  onRefreshData?: () => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  type?: 'order_receipt' | 'stats_summary' | 'reminder_card' | 'general';
  orderData?: Partial<Order>;
  statsData?: any;
  timestamp: string;
}

export const VoiceOSView: React.FC<VoiceOSViewProps> = ({ onRefreshData }) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: 'Namaste! I am your VyaparVaani voice assistant. Tap the mic and speak your order in one go (e.g. "Add an order for Rahul. 20 shirts, total 15000 rupees") or ask "How much did I sell today?".',
      timestamp: 'Just now',
    }
  ]);

  const [stage, setStage] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [manualText, setManualText] = useState('');
  const isProcessingRef = useRef(false);

  const handleFinalSpeech = useCallback((spokenText: string) => {
    if (!spokenText.trim()) return;
    executeVoiceCommand(spokenText);
  }, [ttsEnabled]);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSpeaking,
    error: voiceError,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useVoice({
    language: 'en-IN', // 100% locked to reliable English (India)
    onFinalTranscript: handleFinalSpeech,
  });

  useEffect(() => {
    if (isListening) {
      setStage('listening');
    } else if (stage === 'listening') {
      setStage('idle');
    }
  }, [isListening]);

  // 1-Step Instant Execution: Process, Save to DB, Chime, and Speak in ONE GO!
  const executeVoiceCommand = async (rawText: string) => {
    const clean = rawText ? rawText.trim() : '';
    if (!clean || isProcessingRef.current) return;
    isProcessingRef.current = true;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user's spoken sentence
    setMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, sender: 'user', text: clean, timestamp: nowTime },
    ]);

    setStage('processing');

    try {
      // autoExecute = true commits directly to SQLite in this single step!
      const result = await api.processVoice(clean, 'en-IN', true);
      setStage('idle');

      // Authentic Soundbox Chime 🔔
      playSoundboxChime();

      if (result.intent === 'create_order') {
        // Confetti celebration!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        const orderInfo = result.executed_result || result.extracted_data;

        if (ttsEnabled && result.spoken_response) {
          speak(result.spoken_response, 'en-IN');
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            sender: 'assistant',
            text: result.spoken_response,
            type: 'order_receipt',
            orderData: {
              customer_name: orderInfo.customer_name,
              product_name: orderInfo.product_name,
              quantity: orderInfo.quantity,
              total_amount: orderInfo.total_amount,
              status: 'confirmed',
              id: orderInfo.order_id || 'ORD-NEW',
              created_at: new Date().toLocaleDateString('en-IN'),
            },
            timestamp: nowTime,
          },
        ]);
      } else {
        // Direct Query or Reminder or Customer
        if (ttsEnabled && result.spoken_response) {
          speak(result.spoken_response, 'en-IN');
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            sender: 'assistant',
            text: result.spoken_response,
            type: result.intent === 'show_business_summary' ? 'stats_summary' : 'general',
            statsData: result.extracted_data.stats,
            timestamp: nowTime,
          },
        ]);
      }

      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error(err);
      setStage('idle');
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'assistant',
          text: 'Sorry, I did not catch that clearly. Please try again or tap one of the quick chips below.',
          timestamp: nowTime,
        },
      ]);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleSendWhatsApp = (order: Partial<Order>) => {
    const text = encodeURIComponent(
      `Namaste *${order.customer_name}*,\n\nYour order details from *Nandani Textiles, Surat*:\n• *Product:* ${order.product_name}\n• *Quantity:* ${order.quantity} units\n• *Amount:* ₹${Number(order.total_amount || 0).toLocaleString('en-IN')}\n• *Status:* CONFIRMED\n\nThank you for doing business with us!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleUndoOrder = async (orderId?: string) => {
    if (!orderId) return;
    try {
      await api.deleteOrder(orderId);
      if (onRefreshData) onRefreshData();
      alert('Order cancelled and removed.');
    } catch (_) {}
  };

  const presetChips = [
    { label: '👕 Add order for Rahul (₹15,000)', text: 'Add an order for Rahul. 20 shirts, total 15000 rupees.' },
    { label: '👗 Add order for Priya (₹12,000)', text: 'Add an order for Priya. 10 sarees, total 12000 rupees.' },
    { label: '💰 How much did I sell today?', text: 'How much did I sell today?' },
    { label: '📦 Show pending orders', text: 'Show today\'s pending orders.' },
    { label: '⏰ Remind me to call Rahul', text: 'Remind me to call Rahul tomorrow at 11 AM' },
  ];

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-4">
      
      {/* Top Merchant Status Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-slate-900 text-sm tracking-tight">Nandani Textiles</h2>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Zap className="w-3 h-3 text-emerald-600" />
                <span>Instant 1-Step Voice</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">Surat Wholesale Market • English Voice OS</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Mute/Unmute Soundbox Voice */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? 'Mute Soundbox Voice' : 'Unmute Soundbox Voice'}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer"
          >
            {ttsEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Voice Sound ON</span>
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
        
        {/* Ambient glow backgrounds */}
        <div className="absolute top-0 w-64 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* The Voice Orb Button */}
        <div className="relative z-10 mb-3">
          {stage === 'listening' ? (
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse-ring scale-150" />
              <button
                onClick={stopListening}
                className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-2xl shadow-red-500/50 cursor-pointer animate-pulse"
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
              onClick={startListening}
              className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            >
              <Mic className="w-10 h-10 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>

        {/* Live Audio Waves when Listening or Speaking */}
        {(stage === 'listening' || isSpeaking) && (
          <div className="flex items-center space-x-1.5 mb-2 z-10">
            <div className="w-1.5 h-4 bg-indigo-400 rounded-full soundwave-bar" style={{ animationDelay: '0.1s' }} />
            <div className="w-1.5 h-7 bg-indigo-300 rounded-full soundwave-bar" style={{ animationDelay: '0.3s' }} />
            <div className="w-1.5 h-5 bg-indigo-500 rounded-full soundwave-bar" style={{ animationDelay: '0.5s' }} />
            <div className="w-1.5 h-8 bg-indigo-200 rounded-full soundwave-bar" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-4 bg-indigo-400 rounded-full soundwave-bar" style={{ animationDelay: '0.4s' }} />
          </div>
        )}

        {/* Dynamic Voice Status Heading */}
        <div className="text-center z-10 max-w-lg px-4">
          {stage === 'listening' ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-rose-300 font-bold mb-1">
                Listening...
              </p>
              <h3 className="text-lg font-bold text-white min-h-[30px]">
                {interimTranscript || transcript || 'Speak your order now...'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Stop speaking to auto-save, or tap to finish</p>
            </div>
          ) : stage === 'processing' ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-indigo-300 font-bold mb-1">
                Processing Order...
              </p>
              <h3 className="text-lg font-bold text-white">Saving to database & generating bill...</h3>
            </div>
          ) : (
            <div>
              <h3 className="text-base md:text-lg font-bold text-white">
                Tap microphone to speak
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Say your order in one sentence: "Add an order for Rahul. 20 shirts, total 15000 rupees"
              </p>
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
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          One-Click Instant Voice Prompts:
        </p>
        <div className="flex flex-wrap gap-2">
          {presetChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => executeVoiceCommand(chip.text)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50/80 hover:border-indigo-300 text-xs font-semibold text-slate-800 transition-all cursor-pointer flex items-center space-x-1.5 shadow-2xs"
            >
              <span>{chip.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Live Conversational Stream & Digital Bill Receipts */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-4 shadow-xs overflow-y-auto space-y-3 min-h-[250px]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Voice Stream & Instant Bills
          </span>
          <span className="text-[11px] font-mono text-slate-400">Live Transaction Feed</span>
        </div>

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
          >
            {/* Spoken Text Bubble */}
            <div
              className={`max-w-md rounded-2xl p-3 text-xs ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-xs'
                  : 'bg-slate-100 text-slate-900 rounded-tl-xs border border-slate-200'
              }`}
            >
              <p className="font-medium leading-relaxed">{m.text}</p>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>

            {/* Instant Digital Bill Slip on Screen! */}
            {m.type === 'order_receipt' && m.orderData && (
              <div className="mt-2 w-full max-w-sm bg-amber-50/90 border-2 border-dashed border-amber-300 rounded-2xl p-4 shadow-xs font-mono text-xs text-slate-800">
                <div className="text-center pb-2 border-b border-amber-200 mb-2">
                  <h4 className="font-bold text-sm tracking-tight text-slate-900 font-sans">NANDANI TEXTILES</h4>
                  <p className="text-[10px] text-slate-500 font-sans">Surat Wholesale Market • Verified Order Slip</p>
                  <p className="text-[10px] text-slate-400">Slip #{m.orderData.id} • {m.orderData.created_at}</p>
                </div>

                <div className="space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold text-slate-900">{m.orderData.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Item:</span>
                    <span className="font-semibold">{m.orderData.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantity:</span>
                    <span className="font-bold">{m.orderData.quantity} Units</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-amber-200 text-sm font-black text-slate-900">
                    <span>TOTAL:</span>
                    <span className="text-emerald-700">₹{Number(m.orderData.total_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Instant WhatsApp Share + Undo Option */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleSendWhatsApp(m.orderData!)}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send Bill on WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleUndoOrder(m.orderData?.id)}
                    className="w-full text-center text-[11px] text-slate-400 hover:text-red-600 font-sans cursor-pointer py-1"
                  >
                    Cancel / Undo this order
                  </button>
                </div>
              </div>
            )}

            {/* If Sales Summary Query: Render Clean Metric Card */}
            {m.type === 'stats_summary' && m.statsData && (
              <div className="mt-2 w-full max-w-sm bg-indigo-50/90 border border-indigo-200 rounded-2xl p-4 text-xs font-sans">
                <div className="flex items-center space-x-2 text-indigo-900 font-bold mb-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Today's Sales Breakdown</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                    <p className="text-[10px] text-slate-500">Total Revenue</p>
                    <p className="text-sm font-black text-emerald-700">₹{Number(m.statsData.total_revenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                    <p className="text-[10px] text-slate-500">Total Orders</p>
                    <p className="text-sm font-black text-slate-900">{m.statsData.total_orders || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Manual Speech Input Fallback at Bottom */}
      <div className="p-2 bg-white rounded-2xl border border-slate-200 flex items-center space-x-2 shrink-0">
        <input
          type="text"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && manualText.trim()) {
              executeVoiceCommand(manualText);
              setManualText('');
            }
          }}
          placeholder="Or type voice command: e.g. Add an order for Rahul. 20 shirts, total 15000 rupees..."
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
        />
        <button
          onClick={() => {
            if (manualText.trim()) {
              executeVoiceCommand(manualText);
              setManualText('');
            }
          }}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
