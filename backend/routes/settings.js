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

// Update a team member (always_confetti flag and/or Slack member ID)
router.patch('/team-members/:id', async (req, res) => {
  try {
    const { always_confetti, slack_user_id } = req.body;
    if (always_confetti === undefined && slack_user_id === undefined) {
      return res.status(400).json({ error: 'always_confetti or slack_user_id required' });
    }

    const sets = [];
    const values = [];
    if (always_confetti !== undefined) {
      values.push(!!always_confetti);
      sets.push(`always_confetti = $${values.length}`);
    }
    if (slack_user_id !== undefined) {
      const id = (slack_user_id || '').trim();
      if (id && !/^[UW][A-Z0-9]{2,31}$/.test(id)) {
        return res.status(400).json({ error: 'Slack ID should look like U01ABC234' });
      }
      values.push(id || null);
      sets.push(`slack_user_id = $${values.length}`);
    }
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE team_members SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
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
