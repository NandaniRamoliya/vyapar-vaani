import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  ArrowRight,
  Package,
  User,
  IndianRupee,
  Layers,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LanguageCode, VoiceProcessResult } from '../types';
import { useVoice } from '../hooks/useVoice';
import { api } from '../services/api';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  onActionCompleted: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  language,
  onActionCompleted,
}) => {
  const [stage, setStage] = useState<'idle' | 'listening' | 'processing' | 'confirming' | 'executed' | 'error'>('idle');
  const [manualInput, setManualInput] = useState('');
  const [pendingResult, setPendingResult] = useState<VoiceProcessResult | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const processTranscript = async (text: string) => {
    stopListening();
    setStage('processing');
    try {
      const result = await api.processVoice(text, language);
      setPendingResult(result);

      if (result.confirmation_required) {
        setStage('confirming');
        if (ttsEnabled && result.confirmation_prompt) {
          speak(result.confirmation_prompt, language);
        }
      } else {
        // Direct query intent (e.g. show summary)
        setStage('executed');
        setSuccessMessage(result.spoken_response);
        if (ttsEnabled && result.spoken_response) {
          speak(result.spoken_response, language);
        }
        onActionCompleted();
      }
    } catch (err: any) {
      console.error(err);
      setStage('error');
    }
  };

  const handleFinalSpeech = useCallback((spokenText: string) => {
    if (!spokenText.trim()) return;
    processTranscript(spokenText);
  }, [language, ttsEnabled]);

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
    language,
    onFinalTranscript: handleFinalSpeech,
  });

  useEffect(() => {
    if (isOpen) {
      setStage('idle');
      setPendingResult(null);
      setManualInput('');
      setSuccessMessage('');
      setTranscript('');
    } else {
      stopListening();
      stopSpeaking();
    }
  }, [isOpen]);

  // Keep stage in sync with listening
  useEffect(() => {
    if (isListening) {
      setStage('listening');
    }
  }, [isListening]);

  if (!isOpen) return null;

  const handleConfirmAction = async (confirmed: boolean) => {
    if (!pendingResult) return;
    stopSpeaking();
    setStage('processing');

    try {
      const response = await api.confirmVoiceAction(pendingResult.interaction_id, confirmed);
      if (confirmed) {
        setStage('executed');
        setSuccessMessage(response.spoken_response);
        if (ttsEnabled) {
          speak(response.spoken_response, language);
        }
        // Confetti celebration for order placement!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        onActionCompleted();
      } else {
        setStage('idle');
        setPendingResult(null);
        if (ttsEnabled) {
          speak(response.spoken_response, language);
        }
      }
    } catch (err: any) {
      console.error(err);
      setStage('error');
    }
  };

  const handlePresetClick = (presetText: string) => {
    setTranscript(presetText);
    setManualInput(presetText);
    processTranscript(presetText);
  };

  const getPresets = () => {
    if (language === 'gu-IN') {
      return [
        { label: 'રાહુલ માટે ઓર્ડર', text: 'રાહુલ માટે 20 શર્ટ નો ઓર્ડર ઉમેરો, કુલ 15000 રૂપિયા' },
        { label: 'કાલે કોલનું રિમાઇન્ડર', text: 'કાલે સવારે 11 વાગ્યે રાહુલને કોલ કરવાનું યાદ અપાવજો' },
        { label: 'બાકી ઓર્ડર્સ બતાવો', text: 'આજના બાકી ઓર્ડર બતાવો' },
      ];
    }
    if (language === 'hi-IN') {
      return [
        { label: 'राहुल के लिए ऑर्डर', text: 'राहुल के लिए 20 शर्ट्स का ऑर्डर जोड़ो कुल 15000 रुपये' },
        { label: 'कल 11 बजे रिमाइंडर', text: 'कल 11 बजे राहुल को कॉल करने का रिमाइंडर डालो' },
        { label: 'पेंडिंग ऑर्डर्स दिखाओ', text: 'आज के पेंडिंग ऑर्डर्स दिखाओ' },
      ];
    }
    return [
      { label: 'Add Order for Rahul', text: 'Add an order for Rahul. 20 shirts, total 15000 rupees.' },
      { label: 'Reminder to Call', text: 'Remind me to call Rahul tomorrow at 11 AM' },
      { label: 'Show Pending Orders', text: 'Show today\'s pending inquiries.' },
    ];
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
              <p className="text-xs text-slate-500">Multilingual Bharat AI Engine</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? 'Mute spoken audio' : 'Unmute spoken audio'}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4 text-indigo-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Voice Center Content */}
        <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          
          {/* Stage 1: IDLE / READY */}
          {stage === 'idle' && (
            <div className="w-full flex flex-col items-center text-center">
              {voiceError && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2 max-w-sm text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{voiceError}</span>
                </div>
              )}

              <div className="relative mb-6">
                <button
                  onClick={startListening}
                  className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                >
                  <Mic className="w-10 h-10 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              <h4 className="text-lg font-bold text-slate-900">Tap microphone to speak</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Say your order, customer notes or reminders in English, Hindi, or Gujarati.
              </p>

              {/* Sample Voice Presets */}
              <div className="w-full mt-6 pt-5 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  Or click a quick test preset:
                </p>
                <div className="flex flex-col gap-2">
                  {getPresets().map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetClick(preset.text)}
                      className="text-left text-xs bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 p-2.5 rounded-xl transition-all cursor-pointer group flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-700 group-hover:text-indigo-700">"{preset.text}"</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stage 2: LISTENING */}
          {stage === 'listening' && (
            <div className="flex flex-col items-center text-center py-4">
              {voiceError && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2 max-w-sm text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{voiceError}</span>
                </div>
              )}

              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-pulse-ring scale-150" />
                <button
                  onClick={stopListening}
                  className="relative z-10 w-24 h-24 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-500/30 animate-pulse cursor-pointer"
                >
                  <MicOff className="w-10 h-10" />
                </button>
              </div>

              <div className="flex items-center space-x-1.5 mb-3">
                <div className="w-1.5 h-4 bg-indigo-500 rounded-full soundwave-bar" style={{ animationDelay: '0.1s' }} />
                <div className="w-1.5 h-7 bg-indigo-600 rounded-full soundwave-bar" style={{ animationDelay: '0.3s' }} />
                <div className="w-1.5 h-5 bg-indigo-400 rounded-full soundwave-bar" style={{ animationDelay: '0.5s' }} />
                <div className="w-1.5 h-8 bg-indigo-700 rounded-full soundwave-bar" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-4 bg-indigo-500 rounded-full soundwave-bar" style={{ animationDelay: '0.4s' }} />
              </div>

              <h4 className="text-lg font-bold text-slate-900">Listening to your voice...</h4>
              <p className="text-sm text-indigo-600 font-medium min-h-[40px] px-4 mt-2">
                {interimTranscript || transcript || 'Speak now...'}
              </p>

              <button
                onClick={stopListening}
                className="mt-4 px-4 py-1.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Done Speaking
              </button>
            </div>
          )}

          {/* Stage 3: PROCESSING */}
          {stage === 'processing' && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Understanding your command...</h4>
              <p className="text-xs text-slate-500 mt-1">Extracting intent, customer, quantity and amount</p>
            </div>
          )}

          {/* Stage 4: CONFIRMING (The Crucial Workflow Step!) */}
          {stage === 'confirming' && pendingResult && (
            <div className="w-full flex flex-col animate-in fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                    {pendingResult.intent.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400">Action Review</span>
                </div>
                {isSpeaking && (
                  <span className="flex items-center text-xs text-indigo-600 font-medium animate-pulse">
                    <Volume2 className="w-3.5 h-3.5 mr-1" /> Speaking...
                  </span>
                )}
              </div>

              {/* Extracted Details Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Extracted Details</p>
                
                {pendingResult.intent === 'create_order' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
                        <User className="w-3.5 h-3.5" />
                        <span>Customer</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{pendingResult.extracted_data.customer_name || 'N/A'}</p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
                        <Package className="w-3.5 h-3.5" />
                        <span>Product</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{pendingResult.extracted_data.product_name || 'N/A'}</p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Quantity</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{pendingResult.extracted_data.quantity || 0} Units</p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>Total Amount</span>
                      </div>
                      <p className="text-sm font-bold text-emerald-700">₹{Number(pendingResult.extracted_data.total_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )}

                {pendingResult.intent === 'create_reminder' && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-xs text-slate-500">Reminder Task</p>
                    <p className="text-sm font-bold text-slate-900">{pendingResult.extracted_data.title}</p>
                    <p className="text-xs text-indigo-600">
                      Scheduled: {pendingResult.extracted_data.reminder_date} at {pendingResult.extracted_data.reminder_time}
                    </p>
                  </div>
                )}

                {/* Spoken Prompt Question */}
                <div className="mt-3 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                  <p className="text-xs font-semibold text-indigo-950">
                    "{pendingResult.confirmation_prompt}"
                  </p>
                </div>
              </div>

              {/* Confirmation Controls */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleConfirmAction(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel / Edit
                </button>
                <button
                  onClick={() => handleConfirmAction(true)}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Yes, Save Order</span>
                </button>
              </div>
            </div>
          )}

          {/* Stage 5: EXECUTED / SUCCESS */}
          {stage === 'executed' && (
            <div className="flex flex-col items-center text-center py-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Task Completed Successfully!</h4>
              <p className="text-sm text-slate-600 mt-2 max-w-sm px-4">
                {successMessage || 'Your order has been recorded in the database.'}
              </p>

              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => setStage('idle')}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Another Command
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

          {/* Stage 6: ERROR */}
          {stage === 'error' && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Could not complete voice task</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Please check your microphone permissions or try clicking one of the preset prompts.
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
            placeholder="Or type voice command here: e.g. Add an order for Rahul..."
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
