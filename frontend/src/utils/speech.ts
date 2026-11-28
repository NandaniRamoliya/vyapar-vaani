import { LanguageCode } from '../types';
import { speakable } from './lang';

// Prefer warm, natural Indian voices when the device has them.
const PREFERRED_VOICE_NAMES = ['swara', 'neerja', 'dhwani', 'heera', 'kalpana', 'lekha', 'aditi', 'natural', 'google'];

export function pickVoice(voices: SpeechSynthesisVoice[], lang: LanguageCode): SpeechSynthesisVoice | undefined {
  const target = lang.toLowerCase();
  const prefix = target.split('-')[0];
  const exact = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === target);
  const sameLang = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  for (const pool of [exact, sameLang]) {
    for (const key of PREFERRED_VOICE_NAMES) {
      const v = pool.find((x) => x.name.toLowerCase().includes(key));
      if (v) return v;
    }
    if (pool.length) return pool[0];
  }
  return undefined;
}

/** Fire-and-forget speech for places outside the voice screen (e.g. reminder alerts). */
export function speakText(text: string, lang: LanguageCode) {
  if (!('speechSynthesis' in window) || !text) return;
  const u = new SpeechSynthesisUtterance(speakable(text, lang));
  u.lang = lang;
  u.rate = lang === 'en-IN' ? 1.0 : 0.95;
  const voice = pickVoice(window.speechSynthesis.getVoices(), lang);
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

/** Phone notification through the service worker (Android needs this; `new Notification` throws there). */
export async function notify(title: string, body: string, tag: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration();
    const opts = { body, tag, icon: '/icon-192.png', badge: '/icon-192.png', requireInteraction: true } as NotificationOptions;
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch (_e) {
    /* notifications unavailable */
  }
}

export async function askNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch (_e) {
    return Notification.permission;
  }
}
