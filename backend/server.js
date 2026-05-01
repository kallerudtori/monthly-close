require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
const { seed } = require('./db/seed-init');

const { router: authRouter, requireAuth } = require('./routes/auth');
const monthsRouter = require('./routes/months');
const tasksRouter = require('./routes/tasks');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

// Health check
app.get('/healthz', (req, res) => res.json({ ok: true }));

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/months', requireAuth, monthsRouter);
app.use('/api/tasks', requireAuth, tasksRouter);
app.use('/api/settings', requireAuth, settingsRouter);

// Serve React frontend in production
const frontendBuild = path.join(__dirname, '../frontend/build');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
  await pool.query(schema);
  await seed(pool);
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL is not set. Available env vars:', Object.keys(process.env).filter(k => k.includes('POSTGRES') || k.includes('DATABASE') || k.includes('PG')).join(', ') || 'none found');
  } else {
    console.log('DATABASE_URL is set, host:', dbUrl.split('@')[1]?.split('/')[0] ?? 'unknown');
  }
  try {
    await initDb();
    console.log('Database initialized');
  } catch (err) {
    console.error('DB init error:', err.message || err);
  }
});
