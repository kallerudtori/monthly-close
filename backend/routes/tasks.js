const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all tasks for a month (hierarchical)
router.get('/month/:monthId', async (req, res) => {
  try {
    const { monthId } = req.params;

    // Read-only if the month is before the current calendar month
    const now = new Date();
    const monthData = await pool.query('SELECT year, month FROM months WHERE id = $1', [monthId]);
    if (monthData.rows.length === 0) return res.status(404).json({ error: 'Month not found' });
    const { year, month } = monthData.rows[0];
    const isReadOnly = year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1);

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

// Copy assignees + due dates from previous month into target month
router.post('/copy-from-previous/:monthId', async (req, res) => {
  const { monthId } = req.params;
  const client = await pool.connect();
  try {
    // Get target month info
    const targetRes = await pool.query('SELECT year, month FROM months WHERE id = $1', [monthId]);
    if (targetRes.rows.length === 0) return res.status(404).json({ error: 'Month not found' });
    const { year: targetYear, month: targetMonth } = targetRes.rows[0];

    // Find previous month
    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
    const sourceRes = await pool.query(
      'SELECT id FROM months WHERE year = $1 AND month = $2',
      [prevYear, prevMonth]
    );
    if (sourceRes.rows.length === 0) {
      return res.status(404).json({ error: `No data found for ${prevMonth}/${prevYear} to copy from` });
    }
    const sourceMonthId = sourceRes.rows[0].id;

    // Get all subtasks from source month with their assignee and due_date
    const sourceTasks = await pool.query(
      `SELECT template_id, title, assignee, due_date
       FROM tasks WHERE month_id = $1 AND parent_task_id IS NOT NULL`,
      [sourceMonthId]
    );

    // Last day of target month (handles e.g. May 31 → June 30)
    const lastDayOfTargetMonth = new Date(targetYear, targetMonth, 0).getDate();

    await client.query('BEGIN');
    let updated = 0;
    for (const src of sourceTasks.rows) {
      if (!src.assignee && !src.due_date) continue;

      // Shift due date: same day number, new month/year, clamped to month length
      let newDueDate = null;
      if (src.due_date) {
        const day = new Date(src.due_date).getUTCDate();
        const clampedDay = Math.min(day, lastDayOfTargetMonth);
        newDueDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
      }

      // Match target task by template_id, falling back to title match
      let matchQuery, matchParams;
      if (src.template_id) {
        matchQuery = `SELECT id FROM tasks WHERE month_id = $1 AND template_id = $2 AND parent_task_id IS NOT NULL`;
        matchParams = [monthId, src.template_id];
      } else {
        matchQuery = `SELECT id FROM tasks WHERE month_id = $1 AND title = $2 AND parent_task_id IS NOT NULL`;
        matchParams = [monthId, src.title];
      }
      const targets = await client.query(matchQuery, matchParams);
      for (const t of targets.rows) {
        await client.query(
          `UPDATE tasks SET assignee = $1, due_date = $2, updated_at = NOW() WHERE id = $3`,
          [src.assignee || null, newDueDate, t.id]
        );
        updated++;
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true, updated });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
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
