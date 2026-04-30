const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all tasks for a month (hierarchical)
router.get('/month/:monthId', async (req, res) => {
  try {
    const { monthId } = req.params;

    // Check if month is read-only (not the latest month)
    const monthsResult = await pool.query('SELECT id FROM months ORDER BY year DESC, month DESC LIMIT 1');
    const latestMonthId = monthsResult.rows[0]?.id;
    const isReadOnly = latestMonthId && parseInt(monthId) !== latestMonthId;

    const parents = await pool.query(
      `SELECT * FROM tasks WHERE month_id = $1 AND parent_task_id IS NULL ORDER BY sort_order`,
      [monthId]
    );

    const result = [];
    for (const parent of parents.rows) {
      const subtasks = await pool.query(
        `SELECT * FROM tasks
         WHERE month_id = $1 AND parent_task_id = $2
         ORDER BY
           CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
           due_date ASC,
           sort_order ASC`,
        [monthId, parent.id]
      );
      result.push({ ...parent, subtasks: subtasks.rows });
    }

    res.json({ tasks: result, isReadOnly });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a task
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, assignee, due_date, status, notes } = req.body;

    const fields = [];
    const values = [];
    let i = 1;

    if (title !== undefined) { fields.push(`title = $${i++}`); values.push(title); }
    if (assignee !== undefined) { fields.push(`assignee = $${i++}`); values.push(assignee || null); }
    if (due_date !== undefined) { fields.push(`due_date = $${i++}`); values.push(due_date || null); }
    if (status !== undefined) { fields.push(`status = $${i++}`); values.push(status); }
    if (notes !== undefined) { fields.push(`notes = $${i++}`); values.push(notes || null); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a parent task
router.post('/parent', async (req, res) => {
  try {
    const { monthId, title } = req.body;
    const orderRes = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tasks WHERE month_id = $1 AND parent_task_id IS NULL',
      [monthId]
    );
    const sortOrder = orderRes.rows[0].next;
    const result = await pool.query(
      `INSERT INTO tasks (month_id, title, status, sort_order) VALUES ($1, $2, 'not_started', $3) RETURNING *`,
      [monthId, title, sortOrder]
    );
    res.json({ ...result.rows[0], subtasks: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a subtask
router.post('/subtask', async (req, res) => {
  try {
    const { monthId, parentTaskId, title } = req.body;
    const orderRes = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tasks WHERE month_id = $1 AND parent_task_id = $2',
      [monthId, parentTaskId]
    );
    const sortOrder = orderRes.rows[0].next;
    const result = await pool.query(
      `INSERT INTO tasks (month_id, parent_task_id, title, status, sort_order) VALUES ($1, $2, $3, 'not_started', $4) RETURNING *`,
      [monthId, parentTaskId, title, sortOrder]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a task (and its subtasks via CASCADE)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder parent tasks
router.post('/reorder-parents', async (req, res) => {
  const { monthId, orderedIds } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE tasks SET sort_order = $1 WHERE id = $2 AND month_id = $3',
        [i, orderedIds[i], monthId]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
