const express   = require('express');
const cors      = require('cors');
const path      = require('path');
require('dotenv').config();

const authRoutes     = require('./routes/auth');
const adminRoutes    = require('./routes/admin');
const ngoRoutes      = require('./routes/ngo');
const donationRoutes = require('./routes/donations');

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ───────────────────────────────────────────────
app.use('/auth',      authRoutes);
app.use('/admin',     adminRoutes);
app.use('/ngo',       ngoRoutes);
app.use('/ngos',      ngoRoutes);          // alias for public donor listing
app.use('/donations', donationRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Fallback: serve frontend index ───────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅  CareConnect server running on http://localhost:${PORT}`);
});
