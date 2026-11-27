import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pause, Play, ShieldCheck } from 'lucide-react';
import { VoiceSignature } from '../types';
import { formatINR } from '../utils/whatsapp';

export interface ProofPlayerHandle {
  play: () => Promise<void>;
}

interface Props {
  signature: VoiceSignature;
  compact?: boolean;
  label?: string;
}

/**
 * Plays a customer's voice signature, with the date, amount and the SHA-256 fingerprint
 * that proves the recording has not been changed since it was made.
 */
export const ProofPlayer = forwardRef<ProofPlayerHandle, Props>(({ signature, compact, label }, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // Recordings from MediaRecorder often report Infinity until fully loaded; use the stored length.
  const knownSeconds = (signature.duration_ms || 0) / 1000;

  useImperativeHandle(ref, () => ({
    play: async () => {
      try {
        await audioRef.current?.play();
      } catch (_e) {
        /* autoplay blocked: the button is still there */
      }
    },
  }));

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      const total = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : knownSeconds;
      setProgress(total ? Math.min(1, a.currentTime / total) : 0);
    };
    const onPlay = () => setPlaying(true);
    const onStop = () => {
      setPlaying(false);
      if (a.ended) setProgress(0);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onStop);
    a.addEventListener('ended', onStop);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onStop);
      a.removeEventListener('ended', onStop);
    };
  }, [knownSeconds]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const date = new Date(signature.created_at.replace(' ', 'T'));
  const dateText = isNaN(date.getTime())
    ? signature.created_at
    : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 ${compact ? 'p-2' : 'p-3'}`}>
      <audio ref={audioRef} src={signature.audio_url} preload="metadata" />
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause voice proof' : 'Play voice proof'}
        className={`shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${
          compact ? 'w-8 h-8' : 'w-11 h-11'
        }`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        {!compact && (
          <p className="text-xs font-bold text-emerald-900 truncate">
            {label || signature.customer_name} · {formatINR(signature.amount)}
          </p>
        )}
        {/* playback bar styled as a waveform */}
        <div className="mt-1 flex items-end gap-[2px] h-5" aria-hidden>
          {Array.from({ length: 28 }).map((_, i) => {
            const h = 30 + Math.abs(Math.sin(i * 1.7 + signature.audio_sha256.charCodeAt(i % 60) / 9)) * 70;
            const active = i / 28 < progress;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full ${active ? 'bg-emerald-600' : 'bg-emerald-300/70'}`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <p className="mt-1 text-[10px] text-emerald-800/80 flex items-center gap-1 truncate">
          <ShieldCheck className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {dateText}
            {knownSeconds ? ` · ${knownSeconds.toFixed(1)}s` : ''} · #{signature.audio_sha256.slice(0, 10)}
          </span>
        </p>
      </div>
    </div>
  );
});

ProofPlayer.displayName = 'ProofPlayer';
