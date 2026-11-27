export const SHOP_NAME = 'Nandani Textiles';

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

export function paymentReminderMessage(name: string, balance: number): string {
  const firstName = name.split(' ')[0];
  return (
    `Namaste ${firstName} ji 🙏\n\n` +
    `This is a gentle reminder from *${SHOP_NAME}*.\n` +
    `Your pending khata balance is *${formatINR(balance)}*.\n\n` +
    `Kindly clear it at your earliest convenience via UPI or cash at the shop.\n` +
    `Thank you for your continued business!`
  );
}

export function paymentReceiptMessage(name: string, amount: number, balance: number): string {
  const firstName = name.split(' ')[0];
  return (
    `Namaste ${firstName} ji 🙏\n\n` +
    `*${SHOP_NAME}* has received your payment of *${formatINR(amount)}*. Thank you!\n` +
    (balance > 0
      ? `Remaining khata balance: *${formatINR(balance)}*.`
      : balance === 0
        ? `Your khata is now fully settled ✅`
        : `Advance with us: *${formatINR(balance)}*.`)
  );
}

/** "Paid today" / "12 days since last payment" / "Unpaid for 32 days" */
export function dueAgeLabel(days: number, neverPaid?: boolean): string {
  if (neverPaid) return days === 0 ? 'Udhar given today' : `Unpaid for ${days} days`;
  return days === 0 ? 'Paid today' : `${days} days since last payment`;
}

export function openWhatsApp(phone: string | undefined, message: string) {
  window.open(whatsappUrl(phone, message), '_blank');
}
