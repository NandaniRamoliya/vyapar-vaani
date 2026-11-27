import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LanguageCode, VoiceProcessResult } from '../types';
import { useVoice } from '../hooks/useVoice';
import { api } from '../services/api';
import { playSoundboxChime } from '../utils/soundboxChime';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: LanguageCode;
  onActionCompleted: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onActionCompleted,
}) => {
  const [stage, setStage] = useState<'idle' | 'listening' | 'processing' | 'executed' | 'error'>('idle');
  const [manualInput, setManualInput] = useState('');
  const [executedResult, setExecutedResult] = useState<VoiceProcessResult | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const isProcessingRef = useRef(false);

  const processTranscript = async (text: string) => {
    const cleanText = text ? text.trim() : '';
    if (!cleanText) return;
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setStage('processing');
    try {
      // 1-Step Instant Execution with auto_execute = true!
      const result = await api.processVoice(cleanText, 'en-IN', true);
      setExecutedResult(result);
      setStage('executed');
      setSuccessMessage(result.spoken_response);

      // Authentic Soundbox Chime 🔔
      playSoundboxChime();

      // Confetti celebration if order placed!
      if (result.intent === 'create_order') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      // Natural Voice Confirmation
      if (ttsEnabled && result.spoken_response) {
        speak(result.spoken_response, 'en-IN');
      }

      // Refresh background data
      onActionCompleted();
    } catch (err: any) {
      console.error(err);
      setStage('error');
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleFinalSpeech = useCallback((spokenText: string) => {
    if (!spokenText.trim()) return;
    processTranscript(spokenText);
  }, [ttsEnabled]);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSpeaking,
    isSupported,
    error: voiceError,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    setTranscript,
  } = useVoice({
    language: 'en-IN',
    onFinalTranscript: handleFinalSpeech,
  });

  useEffect(() => {
    if (isOpen) {
      isProcessingRef.current = false;
      setStage('idle');
      setExecutedResult(null);
      setManualInput('');
      setSuccessMessage('');
      setTranscript('');
      // Auto-start listening on open for frictionless voice interaction
      const timer = setTimeout(() => {
        startListening();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      isProcessingRef.current = false;
      stopListening();
      stopSpeaking();
    }
  }, [isOpen]);

  // Keep stage in sync with listening
  useEffect(() => {
    if (isListening && stage !== 'processing' && stage !== 'executed') {
      setStage('listening');
    }
  }, [isListening, stage]);

  if (!isOpen) return null;

  const handlePresetClick = (presetText: string) => {
    setTranscript(presetText);
    setManualInput(presetText);
    processTranscript(presetText);
  };

  const presets = [
    { label: 'Add Order for Rahul', text: 'Add an order for Rahul. 20 shirts, total 15000 rupees.' },
    { label: 'Show Pending Orders', text: 'Show today\'s pending inquiries.' },
    { label: 'Sales Summary', text: 'How much did I sell today?' },
  ];

  const orderInfo = executedResult?.executed_result || executedResult?.extracted_data;

  const openWhatsAppBill = () => {
    if (!orderInfo) return;
    const phone = orderInfo.customer_phone ? orderInfo.customer_phone.replace(/\D/g, '') : '919876543210';
    const text = encodeURIComponent(
      `*VYAPAR VAANI INVOICE SLIP*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Customer: ${orderInfo.customer_name || 'Valued Customer'}\n` +
      `Item: ${orderInfo.product_name || 'Goods'}\n` +
      `Quantity: ${orderInfo.quantity || 1} units\n` +
      `Total: Rs. ${Number(orderInfo.total_amount || 0).toLocaleString('en-IN')}\n` +
      `Status: Confirmed & Logged\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Thank you for doing business with us!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">VyaparVaani Voice Assistant</h3>
              <p className="text-xs text-slate-500">1-Step Instant Soundbox Engine (English India)</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setTtsEnabled(!ttsEnabled);
              }}
              className={`p-2 rounded-xl border text-xs font-medium transition-colors ${
                ttsEnabled 
                  ? 'border-indigo-200 text-indigo-700 bg-indigo-50' 
                  : 'border-slate-200 text-slate-400 hover:bg-slate-50'
              }`}
              title={ttsEnabled ? 'Mute Speech' : 'Enable Speech'}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 flex flex-col justify-center items-center min-h-[320px]">
          
          {/* Stage 1: IDLE */}
          {stage === 'idle' && (
            <div className="flex flex-col items-center text-center">
              <button
                onClick={startListening}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer group mb-4"
              >
                <Mic className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </button>
              <h4 className="text-base font-bold text-slate-900">Tap to Speak Your Order</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Speak naturally in one go: "Add an order for Rahul. 20 shirts, total 15000 rupees."
              </p>

              {/* Quick Presets */}
              <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetClick(preset.text)}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition-colors cursor-pointer"
                  >
                    "{preset.label}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stage 2: LISTENING */}
          {stage === 'listening' && (
            <div className="flex flex-col items-center text-center w-full max-w-md">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center animate-ping absolute inset-0" />
                <button
                  onClick={stopListening}
                  className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Mic className="w-10 h-10 animate-bounce" />
                </button>
              </div>

              {/* Live Audio Visualizer Bars */}
              <div className="flex items-center justify-center space-x-1.5 my-3">
                <span className="w-1.5 h-6 bg-indigo-500 rounded-full animate-pulse" />
                <span className="w-1.5 h-10 bg-indigo-600 rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-8 bg-blue-500 rounded-full animate-pulse [animation-delay:300ms]" />
                <span className="w-1.5 h-12 bg-indigo-500 rounded-full animate-pulse [animation-delay:75ms]" />
                <span className="w-1.5 h-5 bg-blue-400 rounded-full animate-pulse [animation-delay:200ms]" />
              </div>

              <h4 className="text-base font-bold text-slate-900 mt-2">Listening to your order...</h4>
              <p className="text-xs text-indigo-600 font-medium mt-1">
                Speak now. Stops automatically when you pause.
              </p>

              {/* Real-time Transcript Bubble */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 w-full min-h-[64px] flex items-center justify-center">
                <p className="text-sm font-medium text-slate-800 italic">
                  {transcript || interimTranscript || '“Listening... say customer name, quantity, and amount”'}
                </p>
              </div>

              <button
                onClick={stopListening}
                className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
              >
                <MicOff className="w-3.5 h-3.5" />
                <span>Click if finished speaking</span>
              </button>
            </div>
          )}

          {/* Stage 3: PROCESSING */}
          {stage === 'processing' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Saving Order & Generating Bill...</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Extracting customer, items, and amount with zero-key offline NLP engine...
              </p>
            </div>
          )}

          {/* Stage 4: EXECUTED (Instant 1-Step Success & Digital Bill) */}
          {stage === 'executed' && (
            <div className="flex flex-col items-center text-center w-full animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Order Confirmed & Saved!</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm px-4">
                {successMessage || 'Your transaction has been recorded in the database.'}
              </p>

              {/* Instant Digital Bill Slip if Order Placed */}
              {orderInfo && executedResult?.intent === 'create_order' && (
                <div className="mt-4 w-full max-w-sm bg-slate-50 rounded-2xl border border-slate-200 p-4 text-left shadow-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Digital Bill Slip</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Saved</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer:</span>
                      <span className="font-semibold text-slate-800">{orderInfo.customer_name || 'Customer'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Product:</span>
                      <span className="font-semibold text-slate-800">{orderInfo.product_name || 'Goods'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Quantity:</span>
                      <span className="font-semibold text-slate-800">{orderInfo.quantity || 1} pcs</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-bold">
                      <span className="text-slate-800">Total:</span>
                      <span className="text-indigo-600">₹{Number(orderInfo.total_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Send on WhatsApp Button */}
                  <button
                    onClick={openWhatsAppBill}
                    className="mt-3 w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Send Bill on WhatsApp</span>
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-3 mt-5">
                <button
                  onClick={() => {
                    setStage('idle');
                    setExecutedResult(null);
                    setTranscript('');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Another Order
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Stage 5: ERROR */}
          {stage === 'error' && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Could not complete voice task</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Please check your microphone permissions or click one of the preset chips below.
              </p>
              <button
                onClick={() => setStage('idle')}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

        </div>

        {/* Text Input Fallback Bar at Bottom */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center space-x-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && manualInput.trim() && processTranscript(manualInput)}
            placeholder="Or type voice command: e.g. Add an order for Rahul. 20 shirts, total 15000..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
          <button
            onClick={() => manualInput.trim() && processTranscript(manualInput)}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
            title="Send text command"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};