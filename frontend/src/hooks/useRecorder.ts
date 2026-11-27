import { useCallback, useRef, useState } from 'react';

export interface Recording {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

interface RecordOptions {
  maxMs?: number; // hard stop
  silenceMs?: number; // stop after this much silence once the person has spoken
  minMs?: number; // never stop before this
}

function pickMimeType(): string {
  const MR = (window as any).MediaRecorder;
  if (!MR?.isTypeSupported) return '';
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (MR.isTypeSupported(t)) return t;
  }
  return '';
}

/**
 * Records the customer's voice signature. Stops by itself shortly after they finish
 * speaking (silence detection on the live audio level), or when stop() is called.
 */
export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0); // 0..1 for the live meter
  const [elapsedMs, setElapsedMs] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);

  const isSupported = typeof window !== 'undefined' && !!(window as any).MediaRecorder && !!navigator.mediaDevices?.getUserMedia;

  const record = useCallback(async (opts: RecordOptions = {}): Promise<Recording> => {
    const { maxMs = 10000, silenceMs = 1600, minMs = 1200 } = opts;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];

    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext | null = AC ? new AC() : null;
    const analyser = ctx?.createAnalyser();
    if (ctx && analyser) {
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
    }
    const buf = analyser ? new Uint8Array(analyser.fftSize) : null;

    return new Promise<Recording>((resolve, reject) => {
      const started = performance.now();
      let heardVoice = false;
      let lastLoud = started;
      let raf = 0;
      let done = false;

      const cleanup = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        ctx?.close().catch(() => {});
        setIsRecording(false);
        setLevel(0);
        stopRef.current = null;
      };

      const stop = () => {
        if (done) return;
        done = true;
        if (recorder.state !== 'inactive') recorder.stop();
        else cleanup();
      };
      stopRef.current = stop;

      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onerror = () => {
        cleanup();
        reject(new Error('Recording failed'));
      };
      recorder.onstop = () => {
        const durationMs = Math.round(performance.now() - started);
        cleanup();
        const type = recorder.mimeType || mimeType || 'audio/webm';
        resolve({ blob: new Blob(chunks, { type }), durationMs, mimeType: type });
      };

      const tick = () => {
        const now = performance.now();
        setElapsedMs(now - started);
        if (analyser && buf) {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          setLevel(Math.min(1, rms * 6));
          if (rms > 0.035) {
            heardVoice = true;
            lastLoud = now;
          }
        }
        const elapsed = now - started;
        if (elapsed >= maxMs || (heardVoice && elapsed > minMs && now - lastLoud > silenceMs)) {
          stop();
          return;
        }
        raf = requestAnimationFrame(tick);
      };

      recorder.start(250);
      setIsRecording(true);
      setElapsedMs(0);
      raf = requestAnimationFrame(tick);
    });
  }, []);

  const stop = useCallback(() => stopRef.current?.(), []);

  return { record, stop, isRecording, level, elapsedMs, isSupported };
}
