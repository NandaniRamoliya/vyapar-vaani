import { useState, useEffect, useRef, useCallback } from 'react';
import { LanguageCode } from '../types';
import { speakable } from '../utils/lang';
import { pickVoice } from '../utils/speech';

interface UseVoiceOptions {
  language: LanguageCode;
  onFinalTranscript?: (transcript: string) => void;
  /** The mic closed by itself without hearing anything (used to end a hands-free conversation). */
  onNoSpeech?: () => void;
}

interface ListenOptions {
  lang?: LanguageCode;
  /** Pause length that ends the utterance (shorter for yes/no replies). */
  silenceMs?: number;
}

// Android/iOS recognisers misbehave in continuous mode (words get repeated), so on phones
// we listen one utterance at a time and let the engine end it on a pause.
const IS_MOBILE = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function useVoice({ language, onFinalTranscript, onNoSpeech }: UseVoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(
    () => typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
  );
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTextRef = useRef('');
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const hasSubmittedRef = useRef(false);
  const silenceMsRef = useRef(2000);

  const onNoSpeechRef = useRef(onNoSpeech);
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
    onNoSpeechRef.current = onNoSpeech;
  }, [onFinalTranscript, onNoSpeech]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const abortRecognition = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.abort();
      } catch (_e) {
        /* already stopped */
      }
    }
    setIsListening(false);
  }, []);

  /** Submit what was heard, exactly once. */
  const finalizeSpeech = useCallback(() => {
    if (hasSubmittedRef.current) return;
    const text = accumulatedTextRef.current.trim();
    abortRecognition();
    hasSubmittedRef.current = true;
    setInterimTranscript('');
    if (text) {
      setTranscript(text);
      onFinalTranscriptRef.current?.(text);
    }
  }, [abortRecognition]);

  const stopListening = useCallback(() => finalizeSpeech(), [finalizeSpeech]);

  /** Turn the mic off and discard anything heard so far. */
  const cancelListening = useCallback(() => {
    hasSubmittedRef.current = true;
    accumulatedTextRef.current = '';
    setInterimTranscript('');
    abortRecognition();
  }, [abortRecognition]);

  const startListening = useCallback(
    async (opts?: ListenOptions | unknown) => {
      const o = (opts && typeof opts === 'object' && !('nativeEvent' in (opts as object)) ? opts : {}) as ListenOptions;
      const lang = o.lang || language;
      silenceMsRef.current = typeof o.silenceMs === 'number' ? o.silenceMs : 2000;

      setError(null);
      setTranscript('');
      setInterimTranscript('');
      accumulatedTextRef.current = '';
      hasSubmittedRef.current = false;

      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        setError('Voice input needs Chrome or Edge (or Safari on iPhone). You can type below meanwhile.');
        return;
      }
      if (!window.isSecureContext) {
        setError('The microphone only works on https:// or localhost. On a phone, run "npm run phone" and open the https link.');
        return;
      }
      abortRecognition();
      hasSubmittedRef.current = false;

      try {
        const rec = new SR();
        rec.continuous = !IS_MOBILE;
        rec.interimResults = true;
        rec.lang = lang;
        rec.maxAlternatives = 1;

        rec.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        rec.onresult = (event: any) => {
          if (hasSubmittedRef.current) return;
          let finalText = '';
          let interim = '';
          for (let i = 0; i < event.results.length; ++i) {
            const r = event.results[i];
            if (r.isFinal) finalText += r[0].transcript + ' ';
            else interim += r[0].transcript;
          }
          const combined = (finalText + interim).trim();
          if (!combined) return;
          accumulatedTextRef.current = combined;
          setInterimTranscript(combined);
          clearSilenceTimer();
          silenceTimerRef.current = setTimeout(finalizeSpeech, silenceMsRef.current);
        };

        rec.onerror = (event: any) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setError('mic-blocked');
          } else if (event.error === 'network') {
            setError('Speech service needs internet. You can type below.');
          } else if (event.error === 'language-not-supported') {
            setError(`This browser can't recognise ${lang} speech. Try Chrome on Android.`);
          }
          // 'no-speech' and 'aborted' are normal: the person just didn't say anything
        };

        rec.onend = () => {
          // Ignore the late "end" of an older session that was replaced by a new one
          if (recognitionRef.current !== rec && recognitionRef.current !== null) return;
          recognitionRef.current = null;
          setIsListening(false);
          // Mobile engines end on their own after a pause: submit what we heard
          if (!hasSubmittedRef.current && accumulatedTextRef.current.trim()) finalizeSpeech();
          else if (!hasSubmittedRef.current) {
            hasSubmittedRef.current = true;
            onNoSpeechRef.current?.();
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.error('Failed to start SpeechRecognition:', err);
        setError('Could not start the microphone. Please check permissions.');
        setIsListening(false);
      }
    },
    [language, abortRecognition, finalizeSpeech],
  );

  /** Speak in the given language; onEnd fires exactly once (also if the browser drops the event). */
  const speak = useCallback(
    (text: string, lang: LanguageCode = language, onEnd?: () => void) => {
      let finished = false;
      let fallback: ReturnType<typeof setTimeout> | null = null;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (fallback) clearTimeout(fallback);
        setIsSpeaking(false);
        onEnd?.();
      };
      if (!('speechSynthesis' in window) || !text) {
        finish();
        return;
      }
      window.speechSynthesis.cancel();

      const spoken = speakable(text, lang);
      const u = new SpeechSynthesisUtterance(spoken);
      u.lang = lang;
      u.rate = lang === 'en-IN' ? 1.0 : 0.95;
      u.pitch = 1.05;
      const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices();
      const voice = pickVoice(voices, lang);
      if (voice) u.voice = voice;

      u.onstart = () => setIsSpeaking(true);
      u.onend = finish;
      u.onerror = finish;
      // Chrome sometimes never fires onend; never leave the conversation stuck.
      fallback = setTimeout(finish, 3000 + spoken.length * 95);
      setIsSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [language],
  );

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
