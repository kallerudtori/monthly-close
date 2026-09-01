// Copies assignees, due dates, and any manually-added tasks from the previous
// month into the target month. Safe to call on a freshly-created month.
async function copyFromPrevious(client, monthId) {
  const targetRes = await client.query('SELECT year, month FROM months WHERE id = $1', [monthId]);
  if (targetRes.rows.length === 0) return { updated: 0, created: 0 };
  const { year: targetYear, month: targetMonth } = targetRes.rows[0];

  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear  = targetMonth === 1 ? targetYear - 1 : targetYear;
  const sourceRes = await client.query(
    'SELECT id FROM months WHERE year = $1 AND month = $2',
    [prevYear, prevMonth]
  );
  if (sourceRes.rows.length === 0) return { updated: 0, created: 0 };
  const sourceMonthId = sourceRes.rows[0].id;

  const lastDay = new Date(targetYear, targetMonth, 0).getDate();

  function shiftDate(due_date) {
    if (!due_date) return null;
    const day = new Date(due_date).getUTCDate();
    const d = Math.min(day, lastDay);
    return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  let updated = 0;
  let created = 0;

  const sourceParents = await client.query(
    `SELECT * FROM tasks WHERE month_id = $1 AND parent_task_id IS NULL ORDER BY sort_order`,
    [sourceMonthId]
  );

  for (const srcParent of sourceParents.rows) {
    // Find or create matching parent in target month
    let targetParentId;
    const matchParent = await client.query(
      srcParent.template_id
        ? `SELECT id FROM tasks WHERE month_id = $1 AND template_id = $2 AND parent_task_id IS NULL`
        : `SELECT id FROM tasks WHERE month_id = $1 AND title = $2 AND parent_task_id IS NULL`,
      srcParent.template_id ? [monthId, srcParent.template_id] : [monthId, srcParent.title]
    );

    if (matchParent.rows.length > 0) {
      targetParentId = matchParent.rows[0].id;
    } else {
      const orderRes = await client.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tasks WHERE month_id = $1 AND parent_task_id IS NULL`,
        [monthId]
      );
      const newParent = await client.query(
        `INSERT INTO tasks (month_id, template_id, title, status, sort_order)
         VALUES ($1, $2, $3, 'not_started', $4) RETURNING id`,
        [monthId, srcParent.template_id || null, srcParent.title, orderRes.rows[0].next]
      );
      targetParentId = newParent.rows[0].id;
      created++;
    }

    // Process subtasks
    const sourceSubtasks = await client.query(
      `SELECT * FROM tasks WHERE month_id = $1 AND parent_task_id = $2 ORDER BY sort_order`,
      [sourceMonthId, srcParent.id]
    );

    for (const srcSub of sourceSubtasks.rows) {
      const newDueDate = shiftDate(srcSub.due_date);
      const matchSub = await client.query(
        srcSub.template_id
          ? `SELECT id FROM tasks WHERE month_id = $1 AND template_id = $2 AND parent_task_id = $3`
          : `SELECT id FROM tasks WHERE month_id = $1 AND title = $2 AND parent_task_id = $3`,
        srcSub.template_id
          ? [monthId, srcSub.template_id, targetParentId]
          : [monthId, srcSub.title, targetParentId]
      );

      if (matchSub.rows.length > 0) {
        await client.query(
          `UPDATE tasks SET assignee = $1, due_date = $2, updated_at = NOW() WHERE id = $3`,
          [srcSub.assignee || null, newDueDate, matchSub.rows[0].id]
        );
        updated++;
      } else {
        const orderRes = await client.query(
          `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tasks WHERE month_id = $1 AND parent_task_id = $2`,
          [monthId, targetParentId]
        );
        await client.query(
          `INSERT INTO tasks (month_id, template_id, parent_task_id, title, assignee, due_date, status, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, 'not_started', $7)`,
          [monthId, srcSub.template_id || null, targetParentId, srcSub.title,
           srcSub.assignee || null, newDueDate, orderRes.rows[0].next]
        );
        created++;
      }
    }
  }

  return { updated, created };
}

module.exports = { copyFromPrevious };
