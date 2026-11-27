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
  Receipt, 
  Send,
  Printer,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LanguageCode, VoiceProcessResult, Order } from '../types';
import { useVoice } from '../hooks/useVoice';
import { api } from '../services/api';
import { playSoundboxChime } from '../utils/soundboxChime';

interface VoiceOSViewProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
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

export const VoiceOSView: React.FC<VoiceOSViewProps> = ({
  language,
  onLanguageChange,
  onRefreshData,
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: 
        language === 'gu-IN' ? 'નમસ્તે! હું વ્યાપારવાણી વોઇસ આસિસ્ટન્ટ છું. બોલીને ઓર્ડર નોંધાવો અથવા આજના વેપાર વિશે પૂછો.' :
        language === 'hi-IN' ? 'नमस्ते! मैं व्यापारवाणी वॉइस असिस्टेंट हूँ। बोलकर ऑर्डर दर्ज करें या आज के व्यापार के बारे में पूछें।' :
        'Namaste! I am your VyaparVaani voice assistant. Speak naturally to record orders, follow-ups, or check sales.',
      timestamp: 'Just now',
    }
  ]);

  const [stage, setStage] = useState<'idle' | 'listening' | 'processing' | 'confirming'>('idle');
  const [pendingAction, setPendingAction] = useState<VoiceProcessResult | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [manualText, setManualText] = useState('');
  const isProcessingRef = useRef(false);

  const handleFinalSpeech = useCallback((spokenText: string) => {
    if (!spokenText.trim()) return;
    executeVoiceCommand(spokenText);
  }, [language, ttsEnabled]);

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
    language,
    onFinalTranscript: handleFinalSpeech,
  });

  useEffect(() => {
    if (isListening) {
      setStage('listening');
    } else if (stage === 'listening') {
      setStage('idle');
    }
  }, [isListening]);

  const executeVoiceCommand = async (rawText: string) => {
    const clean = rawText ? rawText.trim() : '';
    if (!clean || isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Add user message to feed
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, sender: 'user', text: clean, timestamp: nowTime },
    ]);

    setStage('processing');

    try {
      const result = await api.processVoice(clean, language);
      setPendingAction(result);

      if (result.confirmation_required) {
        setStage('confirming');
        if (ttsEnabled && result.confirmation_prompt) {
          speak(result.confirmation_prompt, language);
        }
      } else {
        setStage('idle');
        // Handle Direct Queries (e.g. Sales summary, pending orders)
        if (ttsEnabled && result.spoken_response) {
          speak(result.spoken_response, language);
        }
        playSoundboxChime();

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

        if (onRefreshData) onRefreshData();
      }
    } catch (err: any) {
      console.error(err);
      setStage('idle');
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'assistant',
          text: 'Sorry, I had trouble processing that. Please try again or tap one of the chips below.',
          timestamp: nowTime,
        },
      ]);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleConfirmOrder = async (confirmed: boolean) => {
    if (!pendingAction) return;
    stopSpeaking();
    setStage('processing');

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const response = await api.confirmVoiceAction(pendingAction.interaction_id, confirmed);
      setStage('idle');

      if (confirmed) {
        // Authentic Soundbox Chime 🔔
        playSoundboxChime();

        // Confetti celebration!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        if (ttsEnabled) {
          speak(response.spoken_response, language);
        }

        const orderInfo = response.executed_result || pendingAction.extracted_data;

        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            sender: 'assistant',
            text: response.spoken_response,
            type: pendingAction.intent === 'create_order' ? 'order_receipt' : 'general',
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

        if (onRefreshData) onRefreshData();
      } else {
        if (ttsEnabled) {
          speak(response.spoken_response, language);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            sender: 'assistant',
            text: response.spoken_response,
            timestamp: nowTime,
          },
        ]);
      }
      setPendingAction(null);
    } catch (err) {
      console.error(err);
      setStage('idle');
    }
  };

  const handleSendWhatsApp = (order: Partial<Order>) => {
    const text = encodeURIComponent(
      `Namaste *${order.customer_name}*,\n\nYour order details from *Nandani Textiles, Surat*:\n• *Product:* ${order.product_name}\n• *Quantity:* ${order.quantity} units\n• *Amount:* ₹${Number(order.total_amount || 0).toLocaleString('en-IN')}\n• *Status:* CONFIRMED\n\nThank you for doing business with us!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const getPresetChips = () => {
    if (language === 'gu-IN') {
      return [
        { label: '👕 રાહુલ માટે ઓર્ડર', text: 'રાહુલ માટે 20 શર્ટ નો ઓર્ડર ઉમેરો, કુલ 15000 રૂપિયા' },
        { label: '💰 આજનો વેપાર કેટલો?', text: 'આજનો વેપાર કેટલો થયો?' },
        { label: '📦 બાકી ઓર્ડર બતાવો', text: 'આજના બાકી ઓર્ડર બતાવો' },
        { label: '⏰ કાલે કોલનું રિમાઇન્ડર', text: 'કાલે સવારે 11 વાગ્યે રાહુલને કોલ કરવાનું યાદ અપાવજો' },
      ];
    }
    if (language === 'hi-IN') {
      return [
        { label: '👕 राहुल के लिए ऑर्डर', text: 'राहुल के लिए 20 शर्ट्स का ऑर्डर जोड़ो कुल 15000 रुपये' },
        { label: '💰 आज का व्यापार कितना?', text: 'आज का व्यापार कितना हुआ?' },
        { label: '📦 पेंडिंग ऑर्डर्स दिखाओ', text: 'आज के पेंडिंग ऑर्डर्स दिखाओ' },
        { label: '⏰ कल 11 बजे रिमाइंडर', text: 'कल 11 बजे राहुल को कॉल करने का रिमाइंडर डालो' },
      ];
    }
    return [
      { label: '👕 Order for Rahul', text: 'Add an order for Rahul. 20 shirts, total 15000 rupees.' },
      { label: '💰 Today\'s Total Sales', text: 'How much did I sell today?' },
      { label: '📦 Show Pending Orders', text: 'Show today\'s pending orders.' },
      { label: '⏰ Call Reminder', text: 'Remind me to call Rahul tomorrow at 11 AM' },
    ];
  };

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
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Soundbox Active
              </span>
            </div>
            <p className="text-xs text-slate-500">Surat Wholesale Market • Bharat Voice OS</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mute/Unmute Soundbox Voice */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? 'Mute Soundbox Voice' : 'Unmute Soundbox Voice'}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4 text-indigo-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Regional Dialect Selector */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => onLanguageChange('en-IN')}
              className={`px-3 py-1 font-semibold rounded-lg transition-colors cursor-pointer ${
                language === 'en-IN' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => onLanguageChange('hi-IN')}
              className={`px-3 py-1 font-semibold rounded-lg transition-colors cursor-pointer ${
                language === 'hi-IN' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => onLanguageChange('gu-IN')}
              className={`px-3 py-1 font-semibold rounded-lg transition-colors cursor-pointer ${
                language === 'gu-IN' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ગુજરાતી
            </button>
          </div>
        </div>
      </div>

      {/* Hero Soundbox Voice Orb Centerpiece */}
      <div className="bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col items-center justify-center shrink-0 min-h-[220px]">
        
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
                Listening to speech...
              </p>
              <h3 className="text-lg font-bold text-white min-h-[30px]">
                {interimTranscript || transcript || 'Speak your command now...'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Pausing for 1.8s auto-submits, or click to stop</p>
            </div>
          ) : stage === 'processing' ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-indigo-300 font-bold mb-1">
                VyaparVaani AI Reasoning...
              </p>
              <h3 className="text-lg font-bold text-white">Extracting business parameters...</h3>
            </div>
          ) : stage === 'confirming' && pendingAction ? (
            <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl text-left w-full max-w-md animate-in fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-400">
                  Verification Required
                </span>
                <span className="text-xs text-slate-400">Speak "Yes" or click</span>
              </div>
              <p className="text-sm font-semibold text-white mb-3">
                "{pendingAction.confirmation_prompt}"
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleConfirmOrder(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-600 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmOrder(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center space-x-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Yes, Confirm Order</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-base md:text-lg font-bold text-white">
                {language === 'gu-IN' ? 'બોલવા માટે માઇક્રોફોન પર ટેપ કરો' :
                 language === 'hi-IN' ? 'बोलने के लिए माइक पर टैप करें' :
                 'Tap microphone to speak'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'gu-IN' ? 'ઓર્ડર ઉમેરો, વેપાર પૂછો, અથવા રિમાઇન્ડર સેટ કરો' :
                 language === 'hi-IN' ? 'ऑर्डर जोड़ें, व्यापार पूछें, या रिमाइंडर सेट करें' :
                 'Record orders, ask sales totals, or set client follow-ups'}
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

      {/* Vernacular Fast-Voice Chips */}
      <div className="shrink-0">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Or tap a quick spoken prompt:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {getPresetChips().map((chip, idx) => (
            <button
              key={idx}
              onClick={() => executeVoiceCommand(chip.text)}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50/80 hover:border-indigo-300 text-left text-xs font-medium text-slate-800 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
            >
              <span className="truncate">{chip.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-1.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Live Conversational Stream & Digital Bill Receipts */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-4 shadow-xs overflow-y-auto space-y-3 min-h-[250px]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Voice Stream & Digital Bills
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

            {/* If Order Created: Render Authentic Kaccha Bill / Receipt Slip! */}
            {m.type === 'order_receipt' && m.orderData && (
              <div className="mt-2 w-full max-w-sm bg-amber-50/80 border-2 border-dashed border-amber-300 rounded-2xl p-4 shadow-xs font-mono text-xs text-slate-800">
                <div className="text-center pb-2 border-b border-amber-200 mb-2">
                  <h4 className="font-bold text-sm tracking-tight text-slate-900">NANDANI TEXTILES</h4>
                  <p className="text-[10px] text-slate-500">Surat Wholesale Market • Voice Order Slip</p>
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

                {/* Instant WhatsApp Invoice Share Button */}
                <button
                  onClick={() => handleSendWhatsApp(m.orderData!)}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send Bill on WhatsApp</span>
                </button>
              </div>
            )}

            {/* If Sales Summary: Render Clean Metric Card */}
            {m.type === 'stats_summary' && m.statsData && (
              <div className="mt-2 w-full max-w-sm bg-indigo-50/90 border border-indigo-200 rounded-2xl p-4 text-xs font-sans">
                <div className="flex items-center space-x-2 text-indigo-900 font-bold mb-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Daily Sales Breakdown</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                    <p className="text-[10px] text-slate-500">Total Revenue</p>
                    <p className="text-sm font-black text-emerald-700">₹{Number(m.statsData.total_revenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                    <p className="text-[10px] text-slate-500">Orders</p>
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
          placeholder="Or type voice command: e.g. Rahul mate 20 shirts 15000..."
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
