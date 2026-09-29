// A month is locked (read-only) once it's before the current calendar month.
async function isMonthReadOnly(db, monthId) {
  const result = await db.query('SELECT year, month FROM months WHERE id = $1', [monthId]);
  if (result.rows.length === 0) return null; // month doesn't exist
  const { year, month } = result.rows[0];
  const now = new Date();
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
}

async function getMonthIdForTask(db, taskId) {
  const result = await db.query('SELECT month_id FROM tasks WHERE id = $1', [taskId]);
  return result.rows.length > 0 ? result.rows[0].month_id : null;
}

const LOCKED_MESSAGE = 'This month is locked and can\'t be edited.';

module.exports = { isMonthReadOnly, getMonthIdForTask, LOCKED_MESSAGE };
