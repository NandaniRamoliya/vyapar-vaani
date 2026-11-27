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
  const hasSubmittedRef = useRef<boolean>(false);
  const silenceMsRef = useRef<number>(2200);

  // Keep callback ref updated without causing re-renders
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

  // Safe internal stop: shuts down recognition and cancels timers without submitting
  const abortListeningInternal = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Finalizes speech and submits ONCE
  const finalizeSpeech = useCallback(() => {
    if (hasSubmittedRef.current) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const textToSubmit = accumulatedTextRef.current.trim();
    abortListeningInternal();

    if (textToSubmit) {
      hasSubmittedRef.current = true;
      setTranscript(textToSubmit);
      setInterimTranscript('');
      if (onFinalTranscriptRef.current) {
        onFinalTranscriptRef.current(textToSubmit);
      }
    }
  }, [abortListeningInternal]);

  const stopListening = useCallback(() => {
    finalizeSpeech();
  }, [finalizeSpeech]);

  /** Turn the mic off and throw away anything heard so far (nothing is submitted). */
  const cancelListening = useCallback(() => {
    hasSubmittedRef.current = true;
    accumulatedTextRef.current = '';
    setInterimTranscript('');
    abortListeningInternal();
  }, [abortListeningInternal]);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    // Automatically finalize after a pause (2.2s for commands, shorter for yes/no replies)
    silenceTimerRef.current = setTimeout(() => {
      finalizeSpeech();
    }, silenceMsRef.current);
  }, [finalizeSpeech]);

  /**
   * Start the mic. `silenceMs` shortens the pause detection, e.g. for one-word "yes"/"haan" replies.
   * Safe to pass directly as an onClick handler (the click event is ignored).
   */
  const startListening = useCallback(async (opts?: { silenceMs?: number } | unknown) => {
    const requested = (opts as { silenceMs?: number } | undefined)?.silenceMs;
    silenceMsRef.current = typeof requested === 'number' ? requested : 2200;
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    accumulatedTextRef.current = '';
    hasSubmittedRef.current = false;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setIsSupported(false);
      return;
    }

    abortListeningInternal();

    // Verify microphone access explicitly
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (permErr: any) {
      console.warn('Microphone permission check:', permErr);
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please click the lock or camera icon in your browser URL bar to allow microphone access.');
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
        hasSubmittedRef.current = false;
      };

      recognition.onresult = (event: any) => {
        if (hasSubmittedRef.current) return;

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
        if (combined) {
          accumulatedTextRef.current = combined;
          setInterimTranscript(currentInterim);
          if (currentFinal) {
            setTranscript(currentFinal.trim());
          }
          // Reset silence detection timer whenever words are spoken
          resetSilenceTimer();
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone permissions in your browser URL bar.');
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
      setError('Could not initialize microphone. Please check permissions or use one of the presets.');
      setIsListening(false);
    }
  }, [language, abortListeningInternal, resetSilenceTimer]);

  /**
   * Warm, natural human Indian TTS speech synthesis
   */
  const speak = useCallback((text: string, lang: LanguageCode = language, onEnd?: () => void) => {
    // Fire onEnd exactly once: on the utterance's end/error, or via a fallback timer because
    // Chrome occasionally never fires `onend` for longer utterances.
    let finished = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      setIsSpeaking(false);
      onEnd?.();
    };

    if (!('speechSynthesis' in window)) {
      finish();
      return;
    }

    window.speechSynthesis.cancel(); // Cancel any ongoing speech

    // Natural formatting for speech
    const naturalText = text
      .replace(/₹\s*([0-9,]+)/g, '$1 rupees')
      .replace(/•/g, ', ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(naturalText);
    utterance.lang = lang;
    utterance.rate = 0.94; // Natural human cadence
    utterance.pitch = 1.02;

    const voices = availableVoicesRef.current.length > 0 
      ? availableVoicesRef.current 
      : window.speechSynthesis.getVoices();

    // Priority 1: High quality Natural / Online neural voices
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

    // Priority 3: Any Indian voice
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
    utterance.onend = finish;
    utterance.onerror = finish;

    if (onEnd) {
      fallbackTimer = setTimeout(finish, 2500 + naturalText.length * 90);
    }

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
    cancelListening,
    speak,
    stopSpeaking,
    setTranscript,
  };
}
