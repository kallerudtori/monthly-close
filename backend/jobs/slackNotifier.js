const pool = require('../db');

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

async function sendSlackNotification() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Slack] SLACK_WEBHOOK_URL not set, skipping notification');
    return;
  }

  // Work in Mountain Time
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
  const todayStr = toDateStr(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toDateStr(tomorrow);

  // Get current month
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthRes = await pool.query(
    'SELECT id FROM months WHERE year = $1 AND month = $2',
    [currentYear, currentMonth]
  );
  if (monthRes.rows.length === 0) return;
  const monthId = monthRes.rows[0].id;

  // Query overdue and due-tomorrow subtasks
  const result = await pool.query(
    `SELECT
       t.id, t.title, t.assignee, t.due_date, t.status,
       p.title AS group_title
     FROM tasks t
     JOIN tasks p ON p.id = t.parent_task_id
     WHERE t.month_id = $1
       AND t.parent_task_id IS NOT NULL
       AND t.status != 'complete'
       AND t.due_date IS NOT NULL
       AND t.due_date::date <= $2
     ORDER BY t.due_date ASC, p.sort_order ASC, t.sort_order ASC`,
    [monthId, tomorrowStr]
  );

  if (result.rows.length === 0) {
    console.log('[Slack] No tasks due tomorrow or overdue — no notification sent');
    return;
  }

  const overdue = result.rows.filter(t => t.due_date.toISOString().split('T')[0] < todayStr);
  const dueTomorrow = result.rows.filter(t => t.due_date.toISOString().split('T')[0] === tomorrowStr);

  const monthLabel = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;
  const blocks = [];

  // Header
  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: `📋 Monthly Close — ${monthLabel}`, emoji: true }
  });

  // Due tomorrow section
  if (dueTomorrow.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*⏰ Due Tomorrow (${formatDate(tomorrowStr)})*` }
    });
    for (const task of dueTomorrow) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *${task.group_title}* › ${task.title}${task.assignee ? `  —  ${task.assignee}` : ''}`
        }
      });
    }
  }

  // Overdue section
  if (overdue.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*🔴 Overdue*` }
    });
    for (const task of overdue) {
      const dueDateStr = task.due_date.toISOString().split('T')[0];
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *${task.group_title}* › ${task.title}  —  was due ${formatDate(dueDateStr)}${task.assignee ? `  —  ${task.assignee}` : ''}`
        }
      });
    }
  }

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [{
      type: 'mrkdwn',
      text: `Mark tasks complete at your Monthly Close app to stop these reminders.`
    }]
  });

  const payload = {
    text: `Monthly Close reminder: ${dueTomorrow.length} due tomorrow, ${overdue.length} overdue`,
    blocks
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    console.log(`[Slack] Notification sent — ${dueTomorrow.length} due tomorrow, ${overdue.length} overdue`);
  } else {
    console.error('[Slack] Failed to send notification:', response.status, await response.text());
  }
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`;
}

module.exports = { sendSlackNotification };
