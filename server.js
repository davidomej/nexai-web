'use strict';

require('dotenv').config();

const express   = require('express');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const path      = require('path');
const QRCode    = require('qrcode');

const app  = express();
const PORT = process.env.PORT || 3000;

// Only this directory is served publicly. Backend files (server.js,
// Dockerfile, package.json, .env) live outside it and are never exposed.
const PUBLIC_DIR = path.join(__dirname, 'public');

// Email is sent through the Resend HTTP API (port 443) because most VPS
// providers (DigitalOcean, etc.) block outbound SMTP ports 25/465/587.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM     = process.env.EMAIL_FROM || 'Nexa AI <onboarding@resend.dev>';
const CONTACT_EMAIL  = process.env.CONTACT_EMAIL;

// WhatsApp number for the floating button, digits only (international format, no "+").
const WHATSAPP_NUMBER  = String(process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
const WHATSAPP_MESSAGE = '¡Hola! Me gustaría reservar una demostración de Nexa AI para ver cómo puede gestionar las citas de mi negocio.';
const WHATSAPP_LINK    = WHATSAPP_NUMBER
  ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
  : null;

// Coolify sits behind a reverse proxy — trust the first hop so
// express-rate-limit can read the real client IP from X-Forwarded-For
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:              ["'self'"],
      scriptSrc:               ["'self'"],
      styleSrc:                ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc:                 ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:                  ["'self'", 'data:'],
      connectSrc:              ["'self'"],
      upgradeInsecureRequests: null, // disabled — let Coolify/proxy handle HTTPS
    },
  },
  // nexaai.es has a valid Let's Encrypt cert via Coolify → enable HSTS
  strictTransportSecurity: {
    maxAge: 15552000, // 180 days
    includeSubDomains: true,
  },
}));

// ── Body parsing (size limit to prevent large payload attacks) ───────────────
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// ── Rate limiting for the contact endpoint ───────────────────────────────────
const contactLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              5,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { ok: false, error: 'Demasiados intentos. Prueba en 15 minutos.' },
});

// ── Helper: send email via Resend HTTP API ───────────────────────────────────
async function sendEmail({ subject, html, text, replyTo }) {
  const controller = new AbortController();
  const deadline   = setTimeout(() => controller.abort(), 15_000); // 15s max

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     EMAIL_FROM,
        to:       CONTACT_EMAIL,
        reply_to: replyTo,
        subject,
        html,
        text,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const detail = await resp.text();
      throw new Error(`Resend API ${resp.status}: ${detail}`);
    }
  } finally {
    clearTimeout(deadline);
  }
}

// ── Helper: escape HTML so injected markup can't render in email clients ─────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── Helper: validate & sanitize the incoming fields ──────────────────────────
function parseBody(body) {
  const errors = [];

  const name     = validator.trim(String(body.name     || ''));
  const business = validator.trim(String(body.business || ''));
  const phone    = validator.trim(String(body.phone    || ''));
  const email    = validator.trim(String(body.email    || ''));

  if (!name     || name.length     > 100) errors.push('Nombre inválido.');
  if (!business || business.length > 150) errors.push('Nombre del negocio inválido.');
  if (!phone    || phone.length    > 30)  errors.push('Teléfono inválido.');
  if (!validator.isEmail(email))          errors.push('Email inválido.');

  return {
    errors,
    data: {
      name:     escapeHtml(name),
      business: escapeHtml(business),
      phone:    escapeHtml(phone),
      email:    escapeHtml(email),
    },
  };
}

// ── POST /api/contact ─────────────────────────────────────────────────────────
app.post('/api/contact', contactLimiter, async (req, res) => {
  const { errors, data } = parseBody(req.body);

  if (errors.length) {
    return res.status(400).json({ ok: false, error: errors.join(' ') });
  }

  const html = `
    <h2 style="color:#128C7E">Nueva solicitud — Nexa AI</h2>
    <table cellpadding="6" style="font-family:sans-serif;font-size:15px">
      <tr><td><b>Nombre</b></td><td>${data.name}</td></tr>
      <tr><td><b>Negocio</b></td><td>${data.business}</td></tr>
      <tr><td><b>Teléfono</b></td><td>${data.phone}</td></tr>
      <tr><td><b>Email</b></td><td>${data.email}</td></tr>
    </table>
    <p style="margin-top:16px;color:#555">El cliente ha solicitado el primer mes gratuito de Nexa AI.</p>
  `;

  try {
    await sendEmail({
      subject: `[Nexa AI] Nueva solicitud de ${data.business}`,
      html,
      text:    `Nombre: ${data.name}\nNegocio: ${data.business}\nTeléfono: ${data.phone}\nEmail: ${data.email}`,
      replyTo: data.email,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Error sending email:', err.message);
    res.status(500).json({ ok: false, error: 'Error al enviar el mensaje. Inténtalo de nuevo.' });
  }
});

// ── Thank-you page (used as Google Ads conversion goal) ──────────────────────
app.get('/thanks', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'thanks.html'));
});

// ── Legal pages: clean URLs required by Google Ads/app store verification ────
app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'privacy.html'));
});

app.get('/terms', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'terms.html'));
});

// ── WhatsApp floating button: link + QR (desktop fallback) ──────────────────
// The wa.me link is only generated server-side to keep WHATSAPP_MESSAGE (with
// accents/emoji) correctly encoded once, instead of duplicating it client-side.
app.get('/api/whatsapp-link', (_req, res) => {
  if (!WHATSAPP_LINK) {
    return res.status(503).json({ ok: false, error: 'WhatsApp no configurado.' });
  }
  res.json({ ok: true, link: WHATSAPP_LINK, number: WHATSAPP_NUMBER });
});

app.get('/api/whatsapp-qr.svg', async (_req, res) => {
  if (!WHATSAPP_LINK) {
    return res.status(503).end();
  }
  try {
    const svg = await QRCode.toString(WHATSAPP_LINK, {
      type:    'svg',
      margin:  1,
      color:   { dark: '#128C7E', light: '#FFFFFF' },
    });
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  } catch (err) {
    console.error('Error generating WhatsApp QR:', err.message);
    res.status(500).end();
  }
});

// ── Serve static files (only from public/) ───────────────────────────────────
// express.static serves index.html at "/" automatically. There is no client-side
// routing, so unknown paths fall through to a clean 404 instead of echoing the page.
app.use(express.static(PUBLIC_DIR, {
  index: 'index.html',
  dotfiles: 'deny',
}));

app.listen(PORT, () => {
  console.log(`Nexa AI server running on port ${PORT}`);
});
