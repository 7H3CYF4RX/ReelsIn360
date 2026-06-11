require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./src/config/database');
const errorHandler = require('./src/middleware/errorHandler');
const env = require('./src/config/env');

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true });
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/leads', require('./src/routes/leads'));
app.use('/api/projects', require('./src/routes/accounts'));
app.use('/api/operations', require('./src/routes/operations'));
app.use('/api/shooter', require('./src/routes/shooter'));
app.use('/api/editing', require('./src/routes/editing'));
app.use('/api/client', require('./src/routes/clientPortal'));
app.use('/api/delivery', require('./src/routes/delivery'));

// Serve SPA for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Error handler (must be last)
app.use(errorHandler);

// Boot sequence
async function start() {
  try {
    await initDb();
    console.log('[DB] Database initialized.');

    // Auto-seed on first run (non-production only)
    if (env.NODE_ENV !== 'production') {
      const { seed } = require('./src/config/seed');
      seed();
    }

    app.listen(env.PORT, () => {
      console.log(`\n🎬 Reels in 360 CRM running at http://localhost:${env.PORT}`);
      console.log(`   Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('[Boot] Failed to start:', err);
    process.exit(1);
  }
}

start();
