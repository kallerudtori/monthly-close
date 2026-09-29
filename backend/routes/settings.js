const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all team members
router.get('/team-members', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM team_members ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a team member
router.post('/team-members', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const result = await pool.query(
      'INSERT INTO team_members (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
      [name.trim()]
    );
    if (result.rows.length === 0) return res.status(409).json({ error: 'Name already exists' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a team member (currently just the always_confetti flag)
router.patch('/team-members/:id', async (req, res) => {
  try {
    const { always_confetti } = req.body;
    if (always_confetti === undefined) {
      return res.status(400).json({ error: 'always_confetti required' });
    }
    const result = await pool.query(
      'UPDATE team_members SET always_confetti = $1 WHERE id = $2 RETURNING *',
      [!!always_confetti, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Team member not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a team member
router.delete('/team-members/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM team_members WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
