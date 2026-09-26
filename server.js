require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const connectDB = require('./config/db');
const employeeRoutes = require('./routes/employees');
const authRoutes = require('./routes/auth');
const quotationRoutes = require('./routes/quotations');

const app = express();

const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://growthora-qt-frontend-k38blx6w9-growthoraaravind-4160.vercel.app',
  'https://growthora-qt-frontend-kyucosbjo-growthoraaravind-4160.vercel.app',
  ...(process.env.CLIENT_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;

  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && /^growthora-qt-frontend-[a-z0-9]+-growthoraaravind-4160\.vercel\.app$/.test(url.hostname);
  } catch {
    return false;
  }
}

connectDB();

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Static file serving for generated quotation documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'growthora-quotation-server' }));

app.use('/api/employees', employeeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/quotations', quotationRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[server] Growthora Quotation API running on port ${PORT}`));
