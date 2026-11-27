/** Tiny earcons (no audio files): a rising "I'm listening" and a falling "got it". */
let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!ctx || ctx.state === 'closed') ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (_e) {
    return null;
  }
}

function tone(freqs: number[], step = 0.09, volume = 0.08) {
  const c = audioCtx();
  if (!c) return;
  const now = c.currentTime;
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + i * step);
    gain.gain.setValueAtTime(0.0001, now + i * step);
    gain.gain.exponentialRampToValueAtTime(volume, now + i * step + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * step + step * 1.6);
    osc.connect(gain).connect(c.destination);
    osc.start(now + i * step);
    osc.stop(now + i * step + step * 1.8);
  });
}

export const playListenTone = () => tone([660, 990]);
export const playDoneTone = () => tone([880, 587], 0.08, 0.06);
export const playRecordTone = () => tone([523, 784, 1046], 0.08, 0.07);
