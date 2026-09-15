import nodemailer from 'nodemailer';

function orderText(order) {
  const money = (n) => Number(n).toLocaleString('fr-FR');
  return [
    `Commande ${order.order_number}`,
    `─────────────────`,
    `Produit : ${order.product_name}`,
    `Quantité : ${order.quantity} × ${money(order.unit_price)} DA`,
    `Livraison : ${order.delivery_type === 'domicile' ? 'À domicile' : 'Stopdesk'} — ${money(order.delivery_fee)} DA`,
    `TOTAL : ${money(order.total)} DA`,
    ``,
    `Client : ${order.customer_name}`,
    `Téléphone : ${order.phone}`,
    `Wilaya : ${order.wilaya_code} — ${order.wilaya_name}`,
    `Commune : ${order.commune}`,
    order.note ? `Note : ${order.note}` : null,
  ].filter(Boolean).join('\n');
}

export async function notifyNewOrder(order) {
  const text = orderText(order);
  const results = await Promise.allSettled([
    sendTelegram(text),
    sendEmail(`Nouvelle commande ${order.order_number} — ${Number(order.total).toLocaleString('fr-FR')} DA`, text),
  ]);
  for (const r of results) {
    if (r.status === 'rejected') console.error('[notify] failed:', r.reason?.message || r.reason);
  }
  // Never throws: a notification outage must never fail an order.
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return console.warn('[notify] Telegram not configured — skipped');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
  } finally {
    clearTimeout(timer);
  }
}

let mailer;
async function sendEmail(subject, text) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.NOTIFY_EMAIL || user;
  if (!user || !pass) return console.warn('[notify] SMTP not configured — skipped');
  mailer ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user, pass },
  });
  await mailer.sendMail({ from: `"BH Store" <${user}>`, to, subject, text });
}