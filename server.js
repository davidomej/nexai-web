'use strict';

require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const nodemailer = require('nodemailer');
const validator  = require('validator');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

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
  // HSTS only makes sense behind a valid TLS terminator; disable here
  strictTransportSecurity: false,
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

// ── Nodemailer transport ─────────────────────────────────────────────────────
const transport = nodemailer.createTransport({
  host:             process.env.SMTP_HOST,
  port:             Number(process.env.SMTP_PORT) || 587,
  secure:           process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10_000, // 10s to establish TCP connection
  greetingTimeout:   8_000,  // 8s waiting for SMTP greeting
  socketTimeout:     15_000, // 15s of inactivity before giving up
  family:            4,      // force IPv4 — VPS has no IPv6 routing
});

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

  // Hard deadline: if SMTP hangs beyond 20s the client gets an error instead of waiting forever
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('SMTP timeout')), 20_000)
  );

  try {
    await Promise.race([
      transport.sendMail({
        from:    `"Nexa AI Web" <${process.env.SMTP_USER}>`,
        to:      process.env.CONTACT_EMAIL,
        replyTo: data.email,
        subject: `[Nexa AI] Nueva solicitud de ${data.business}`,
        html,
        text: `Nombre: ${data.name}\nNegocio: ${data.business}\nTeléfono: ${data.phone}\nEmail: ${data.email}`,
      }),
      timeout,
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error('Error sending email:', err.message);
    res.status(500).json({ ok: false, error: 'Error al enviar el mensaje. Inténtalo de nuevo.' });
  }
});

// ── Serve static files ────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  dotfiles: 'deny',
}));

// ── Catch-all → index.html ────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Nexa AI server running on port ${PORT}`);
});
