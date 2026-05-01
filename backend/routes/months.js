const express = require('express');
const router = express.Router();
const pool = require('../db');
const { createMonthTasks } = require('../db/seed-init');

// Get all months
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM months ORDER BY year DESC, month DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ensure current month exists (called on app load)
router.post('/ensure-current', async (req, res) => {
  const client = await pool.connect();
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    await client.query('BEGIN');
    const monthRes = await client.query(
      'INSERT INTO months (year, month) VALUES ($1, $2) ON CONFLICT (year, month) DO NOTHING RETURNING id',
      [year, month]
    );

    if (monthRes.rows.length > 0) {
      await createMonthTasks(client, monthRes.rows[0].id);
    }

    await client.query('COMMIT');
    const current = await pool.query('SELECT * FROM months WHERE year = $1 AND month = $2', [year, month]);
    res.json(current.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Prepare a specific future month (year + month in body)
router.post('/prepare', async (req, res) => {
  const client = await pool.connect();
  try {
    const { year, month } = req.body;
    await client.query('BEGIN');
    const monthRes = await client.query(
      'INSERT INTO months (year, month) VALUES ($1, $2) ON CONFLICT (year, month) DO NOTHING RETURNING id',
      [year, month]
    );
    if (monthRes.rows.length > 0) {
      await createMonthTasks(client, monthRes.rows[0].id);
    }
    await client.query('COMMIT');
    const result = await pool.query('SELECT * FROM months WHERE year = $1 AND month = $2', [year, month]);
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
