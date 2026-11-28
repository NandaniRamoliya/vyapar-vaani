import { LanguageCode } from '../types';
import { apiFetch } from '../services/auth';

// Set from the logged-in shop (live binding: importers always see the current name)
export let SHOP_NAME = 'VyaparVaani';
export function setShopName(name: string | undefined) {
  SHOP_NAME = name || 'VyaparVaani';
}

export function formatINR(amount: number): string {
  return `₹${Math.round(Math.abs(amount)).toLocaleString('en-IN')}`;
}

/** wa.me link; without a usable number WhatsApp lets the merchant pick the contact. */
export function whatsappUrl(phone: string | undefined, message: string): string {
  let digits = (phone || '').replace(/[^0-9]/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits === '919800000000') digits = ''; // placeholder number given to voice-created customers
  const text = encodeURIComponent(message);
  return digits.length >= 11 ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

const first = (name: string) => name.split(' ')[0];

export function paymentReminderMessage(name: string, balance: number, lang: LanguageCode = 'en-IN'): string {
  const amt = formatINR(balance);
  if (lang === 'hi-IN') {
    return `नमस्ते ${first(name)} जी 🙏\n\n*${SHOP_NAME}* की ओर से याद दिला रहे हैं:\nआपके खाते में *${amt}* बाकी है।\n\nसुविधा अनुसार UPI या दुकान पर जमा कर दीजिए। धन्यवाद!`;
  }
  if (lang === 'gu-IN') {
    return `નમસ્તે ${first(name)} જી 🙏\n\n*${SHOP_NAME}* તરફથી યાદ અપાવીએ છીએ:\nતમારા ખાતામાં *${amt}* બાકી છે.\n\nઅનુકૂળતા મુજબ UPI અથવા દુકાને જમા કરાવી દેજો. આભાર!`;
  }
  return (
    `Namaste ${first(name)} ji 🙏\n\nA gentle reminder from *${SHOP_NAME}*.\n` +
    `Your pending khata balance is *${amt}*.\n\nKindly clear it via UPI or cash at the shop. Thank you!`
  );
}

export function paymentReceiptMessage(name: string, amount: number, balance: number, lang: LanguageCode = 'en-IN'): string {
  const amt = formatINR(amount);
  const bal = formatINR(balance);
  if (lang === 'hi-IN') {
    return `नमस्ते ${first(name)} जी 🙏\n*${SHOP_NAME}* को आपके *${amt}* मिल गए। धन्यवाद!\n` +
      (balance > 0 ? `बाकी: *${bal}*` : balance === 0 ? 'आपका खाता साफ़ है ✅' : `एडवांस: *${bal}*`);
  }
  if (lang === 'gu-IN') {
    return `નમસ્તે ${first(name)} જી 🙏\n*${SHOP_NAME}* ને તમારા *${amt}* મળી ગયા. આભાર!\n` +
      (balance > 0 ? `બાકી: *${bal}*` : balance === 0 ? 'તમારું ખાતું ચોખ્ખું છે ✅' : `એડવાન્સ: *${bal}*`);
  }
  return `Namaste ${first(name)} ji 🙏\n*${SHOP_NAME}* has received your payment of *${amt}*. Thank you!\n` +
    (balance > 0 ? `Remaining balance: *${bal}*.` : balance === 0 ? 'Your khata is fully settled ✅' : `Advance with us: *${bal}*.`);
}

export function proofMessage(name: string, amount: number, date: string, lang: LanguageCode = 'en-IN'): string {
  const amt = formatINR(amount);
  if (lang === 'hi-IN') return `${first(name)} जी, ${date} को आपने अपनी आवाज़ में ${amt} उधार की पुष्टि की थी। रिकॉर्डिंग साथ में है। – ${SHOP_NAME}`;
  if (lang === 'gu-IN') return `${first(name)} જી, ${date} એ તમે તમારા અવાજમાં ${amt} ઉધારની પુષ્ટિ કરી હતી. રેકોર્ડિંગ સાથે છે. – ${SHOP_NAME}`;
  return `${first(name)} ji, on ${date} you confirmed ${amt} udhar in your own voice. The recording is attached. – ${SHOP_NAME}`;
}

export function openWhatsApp(phone: string | undefined, message: string) {
  window.open(whatsappUrl(phone, message), '_blank');
}

/** "Paid today" / "12 days since last payment" / "Unpaid for 32 days" */
export function dueAgeLabel(days: number, neverPaid?: boolean): string {
  if (neverPaid) return days === 0 ? 'Udhar given today' : `Unpaid for ${days} days`;
  return days === 0 ? 'Paid today' : `${days} days since last payment`;
}

/**
 * Share the customer's own voice clip. On phones this opens the share sheet
 * (WhatsApp included) with the audio file attached; elsewhere it falls back to a text message.
 */
export async function shareVoiceProof(opts: {
  audioUrl: string;
  customerName: string;
  phone?: string;
  amount: number;
  date: string;
  lang: LanguageCode;
}): Promise<'shared' | 'text'> {
  const text = proofMessage(opts.customerName, opts.amount, opts.date, opts.lang);
  try {
    const blob = await (await apiFetch(opts.audioUrl)).blob();
    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([blob], `${first(opts.customerName)}-voice-proof.${ext}`, { type: blob.type });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text });
      return 'shared';
    }
  } catch (_e) {
    /* user cancelled or sharing unsupported: fall back to text */
  }
  openWhatsApp(opts.phone, text);
  return 'text';
}
