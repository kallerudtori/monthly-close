const pool = require('../db');

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const APP_URL = 'https://monthly-close-production.up.railway.app/';

// Current wall-clock time in Mountain Time (Date fields are Denver-local)
function denverNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Maps assignee name -> '<@member id>' when a Slack ID is saved in Settings,
// otherwise leaves the plain name.
async function loadMentions() {
  const res = await pool.query('SELECT name, slack_user_id FROM team_members');
  const map = {};
  for (const row of res.rows) {
    map[row.name] = row.slack_user_id ? `<@${row.slack_user_id}>` : row.name;
  }
  return map;
}

function footerBlock(extra) {
  const lead = extra ? `${extra} ` : '';
  return {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `${lead}<${APP_URL}|Open Monthly Close>` }]
  };
}

async function sendSlackNotification() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Slack] SLACK_WEBHOOK_URL not set, skipping notification');
    return;
  }

  // Work in Mountain Time
  const now = denverNow();
  if (isWeekend(now)) return;

  const todayStr    = toDateStr(now);
  // On Friday, "next business day" is Monday, so Sat/Sun/Mon items are included
  const isFriday    = now.getDay() === 5;
  const tomorrow    = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + (isFriday ? 3 : 1));
  const tomorrowStr = toDateStr(tomorrow);
  const mentions    = await loadMentions();

  // Get current month
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthRes = await pool.query(
    'SELECT id FROM months WHERE year = $1 AND month = $2',
    [currentYear, currentMonth]
  );
  if (monthRes.rows.length === 0) return;
  const monthId = monthRes.rows[0].id;

  // Use to_char so pg returns a plain 'YYYY-MM-DD' string — no timezone conversion issues
  const result = await pool.query(
    `SELECT
       t.title,
       t.assignee,
       to_char(t.due_date, 'YYYY-MM-DD') AS due_date_str,
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
    console.log('[Slack] No tasks due today/tomorrow or overdue — no notification sent');
    return;
  }

  const overdue     = result.rows.filter(t => t.due_date_str <  todayStr);
  const dueToday    = result.rows.filter(t => t.due_date_str === todayStr);
  const dueTomorrow = result.rows.filter(t => t.due_date_str >  todayStr);

  const monthLabel = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;
  const blocks = [];

  // Header
  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: `📋 Monthly Close — ${monthLabel}`, emoji: true }
  });

  // Due tomorrow
  if (dueTomorrow.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: isFriday
          ? `*⏰ Due Next Business Day (through ${formatDate(tomorrowStr)})*`
          : `*⏰ Due Tomorrow (${formatDate(tomorrowStr)})*`
      }
    });
    for (const task of dueTomorrow) {
      blocks.push(taskBlock(task, isFriday ? 'upcoming' : false, mentions));
    }
  }

  // Due today
  if (dueToday.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*📅 Due Today (${formatDate(todayStr)})*` }
    });
    for (const task of dueToday) {
      blocks.push(taskBlock(task, false, mentions));
    }
  }

  // Overdue
  if (overdue.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*🔴 Overdue*` }
    });
    for (const task of overdue) {
      blocks.push(taskBlock(task, true, mentions));
    }
  }

  blocks.push({ type: 'divider' });
  blocks.push(footerBlock('Mark tasks complete in the app to stop these reminders.'));

  const summary = [
    dueTomorrow.length && `${dueTomorrow.length} due tomorrow`,
    dueToday.length    && `${dueToday.length} due today`,
    overdue.length     && `${overdue.length} overdue`,
  ].filter(Boolean).join(', ');

  const payload = {
    text: `Monthly Close reminder: ${summary}`,
    blocks
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    console.log(`[Slack] Notification sent — ${summary}`);
  } else {
    console.error('[Slack] Failed to send:', response.status, await response.text());
  }
}

// 4 PM check-in: open tasks that were due today. Silent if none are open.
async function sendDueTodayCheckin() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Slack] SLACK_WEBHOOK_URL not set, skipping check-in');
    return;
  }

  const now = denverNow();
  if (isWeekend(now)) return;
  const todayStr = toDateStr(now);

  const monthRes = await pool.query(
    'SELECT id FROM months WHERE year = $1 AND month = $2',
    [now.getFullYear(), now.getMonth() + 1]
  );
  if (monthRes.rows.length === 0) return;

  const result = await pool.query(
    `SELECT t.title, t.assignee, p.title AS group_title
     FROM tasks t
     JOIN tasks p ON p.id = t.parent_task_id
     WHERE t.month_id = $1
       AND t.parent_task_id IS NOT NULL
       AND t.status != 'complete'
       AND t.due_date::date = $2
     ORDER BY p.sort_order ASC, t.sort_order ASC`,
    [monthRes.rows[0].id, todayStr]
  );

  if (result.rows.length === 0) {
    console.log('[Slack] Nothing due today is still open — no check-in sent');
    return;
  }

  const mentions = await loadMentions();
  const byPerson = new Map();
  for (const task of result.rows) {
    const key = task.assignee || null;
    if (!byPerson.has(key)) byPerson.set(key, []);
    byPerson.get(key).push(task);
  }

  const blocks = [{
    type: 'header',
    text: { type: 'plain_text', text: '✅ Monthly Close — end-of-day check', emoji: true }
  }, {
    type: 'section',
    text: { type: 'mrkdwn', text: `These were due today and aren't marked complete yet. Did they get done?` }
  }];

  for (const [assignee, tasks] of byPerson) {
    const who = assignee ? (mentions[assignee] || assignee) : '_Unassigned_';
    const lines = tasks.map(t => `• *${t.group_title}* › ${t.title}`).join('\n');
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `${who}\n${lines}` } });
  }

  blocks.push({ type: 'divider' });
  blocks.push(footerBlock('If they\'re done, tick them off in the app.'));

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `Monthly Close check-in: ${result.rows.length} task(s) due today still open`,
      blocks
    })
  });

  if (response.ok) {
    console.log(`[Slack] Check-in sent — ${result.rows.length} open`);
  } else {
    console.error('[Slack] Failed to send check-in:', response.status, await response.text());
  }
}

function taskBlock(task, showDate = false, mentions = {}) {
  const who       = task.assignee ? (mentions[task.assignee] || task.assignee) : null;
  const assignee  = who ? `  —  ${who}` : '';
  const dateLabel = showDate
    ? `  —  ${showDate === 'upcoming' ? 'due' : 'was due'} ${formatDate(task.due_date_str)}`
    : '';
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `• *${task.group_title}* › ${task.title}${dateLabel}${assignee}`
    }
  };
}

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`;
}

module.exports = { sendSlackNotification, sendDueTodayCheckin };
