require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// ── SECURITY MIDDLEWARE ───────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many auth attempts' } });
app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// ── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/petitions', require('./routes/petitions'));
app.use('/api/reviews',   require('./routes/reviews'));
app.use('/api/payments',  require('./routes/payments'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/lawyer',    require('./routes/lawyers'));

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── SERVE FRONTEND ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'frontend/index.html')));

// ── ERROR HANDLER ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════╗
    ║   Nyaya AI Backend Running        ║
    ║   Port: ${PORT}                      ║
    ║   Env:  ${process.env.NODE_ENV || 'development'}               ║
    ╚═══════════════════════════════════╝
    `);
  });
}

module.exports = app;
