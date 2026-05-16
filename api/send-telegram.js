// /api/send-telegram.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientSecret = req.headers['x-secret-key'];
  if (clientSecret !== process.env.SECRET_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // ── Lấy IP thật của client ──
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'Unknown';

  // ── Lấy Location từ IP ──
  let location = 'Unknown';
  try {
    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city`);
    const geo = await geoRes.json();
    if (geo && geo.city) {
      location = `${geo.city}, ${geo.regionName}, ${geo.country}`;
    } else if (geo && geo.country) {
      location = geo.country;
    }
  } catch (_) {
    location = 'Unknown';
  }

  // ── Gắn IP + Location vào đầu message ──
  const fullMessage = `🌐 <b>IP:</b> <code>${ip}</code>\n📍 <b>Location:</b> ${location}\n${message}`;

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: 'Telegram env vars not configured' });
  }

  try {
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: fullMessage,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await telegramRes.json();
    if (!data.ok) {
      return res.status(500).json({ error: data.description });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}