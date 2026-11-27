import { useState, useEffect, useRef, useCallback } from 'react';
import { LanguageCode } from '../types';

interface UseVoiceOptions {
  language: LanguageCode;
  onFinalTranscript?: (transcript: string) => void;
}

export function useVoice({ language, onFinalTranscript }: UseVoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const accumulatedTextRef = useRef<string>('');
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Keep callback ref updated without triggering re-runs
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  // Load and cache natural neural voices
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        availableVoicesRef.current = window.speechSynthesis.getVoices();
      }
    };
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const commitTranscript = useCallback(() => {
    const textToSubmit = (accumulatedTextRef.current || interimTranscript || transcript).trim();
    if (textToSubmit) {
      setTranscript(textToSubmit);
      setInterimTranscript('');
      if (onFinalTranscriptRef.current) {
        onFinalTranscriptRef.current(textToSubmit);
      }
    }
  }, [interimTranscript, transcript]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);

    // Commit whatever text was accumulated during the speech session
    commitTranscript();
  }, [commitTranscript]);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    // Automatically finalize after 1.8 seconds of quiet
    silenceTimerRef.current = setTimeout(() => {
      stopListening();
    }, 1800);
  }, [stopListening]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    accumulatedTextRef.current = '';

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or one of the presets.');
      setIsSupported(false);
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
    }

    // Request microphone access explicitly to ensure browser permissions are active
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release stream since SpeechRecognition handles audio capture
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (permErr: any) {
      console.warn('Microphone permission warning:', permErr);
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser URL bar.');
        return;
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            currentFinal += res[0].transcript + ' ';
          } else {
            currentInterim += res[0].transcript;
          }
        }

        const combined = (currentFinal + currentInterim).trim();
        accumulatedTextRef.current = combined;
        setInterimTranscript(currentInterim);
        if (currentFinal) {
          setTranscript(currentFinal.trim());
        }

        // Reset silence detection timeout on each spoken sound
        resetSilenceTimer();
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone in your browser settings.');
          setIsListening(false);
        } else if (event.error === 'network') {
          setError('Network issue with speech recognition service. You can also use the preset chips below.');
        } else if (event.error !== 'no-speech') {
          setError(`Notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start SpeechRecognition:', err);
      setError('Could not initialize microphone. Please check permissions or try clicking a preset.');
      setIsListening(false);
    }
  }, [language, resetSilenceTimer]);

  /**
   * Warm, natural human Indian TTS speech synthesis
   */
  const speak = useCallback((text: string, lang: LanguageCode = language) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Cancel any current utterance

    // Clean text for natural speech (e.g. read ₹15,000 as "15,000 rupees")
    const naturalText = text
      .replace(/₹\s*([0-9,]+)/g, '$1 rupees')
      .replace(/•/g, ', ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(naturalText);
    utterance.lang = lang;
    // Humanized conversational cadence: 0.92x rate + slightly warm pitch
    utterance.rate = 0.94;
    utterance.pitch = 1.02;

    const voices = availableVoicesRef.current.length > 0 
      ? availableVoicesRef.current 
      : window.speechSynthesis.getVoices();

    // Priority 1: High quality Indian Natural Neural voices (Microsoft Online Natural, Google)
    let selectedVoice = voices.find((v) => {
      const name = v.name.toLowerCase();
      const vLang = v.lang.toLowerCase();
      const targetLangPrefix = lang.split('-')[0].toLowerCase();
      return (
        (name.includes('natural') || name.includes('online') || name.includes('google')) &&
        (name.includes('india') || name.includes('hindi') || name.includes('gujarati') || vLang.includes(targetLangPrefix))
      );
    });

    // Priority 2: Any voice matching language code (e.g. en-IN, hi-IN, gu-IN)
    if (!selectedVoice) {
      selectedVoice = voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase());
    }

    // Priority 3: Any Indian English / Hindi voice
    if (!selectedVoice) {
      selectedVoice = voices.find((v) => {
        const name = v.name.toLowerCase();
        return name.includes('india') || name.includes('hindi') || name.includes('heera') || name.includes('neerja');
      });
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [language]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSpeaking,
    isSupported,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    setTranscript,
  };
}
