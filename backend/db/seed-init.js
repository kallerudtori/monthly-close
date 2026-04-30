const TEAM_MEMBERS = ['Alex', 'Tori', 'Logan', 'Gabe'];

const TASK_TEMPLATES = [
  {
    title: 'PLS',
    subtasks: [
      'TT PLS Query', 'REI PLS Query', 'Azibo PLS Query', 'TC PLS Query',
      'Rentler PLS Query', 'Security Deposits', 'Lula', 'TT Lvble', 'Azibo Lvble',
    ]
  },
  {
    title: 'Ziprent',
    subtasks: ['Ziprent Invoices', 'Ziprent Rent', 'Ziprent Apps by State']
  },
  {
    title: 'Premium Upgrades',
    subtasks: ['TT Premium Upgrade', 'TC Premium Upgrade']
  },
  {
    title: 'Data Package',
    subtasks: [
      'All Queries Pasted', 'All Graphs Updated', 'Raw Data Pull',
      'Sure Data', 'Data Package Insights/Email', 'QA Data Package to Previous Month',
    ]
  },
  {
    title: 'Goals',
    subtasks: ['Model Driver', 'Metabase Goals', 'MMT Goals']
  },
];

async function createMonthTasks(client, monthId) {
  const parents = await client.query(
    'SELECT * FROM task_templates WHERE parent_template_id IS NULL ORDER BY sort_order'
  );
  for (const parent of parents.rows) {
    const parentTaskRes = await client.query(
      `INSERT INTO tasks (month_id, template_id, title, status, sort_order)
       VALUES ($1, $2, $3, 'not_started', $4) RETURNING id`,
      [monthId, parent.id, parent.title, parent.sort_order]
    );
    const parentTaskId = parentTaskRes.rows[0].id;
    const subtasks = await client.query(
      'SELECT * FROM task_templates WHERE parent_template_id = $1 ORDER BY sort_order',
      [parent.id]
    );
    for (const sub of subtasks.rows) {
      await client.query(
        `INSERT INTO tasks (month_id, template_id, parent_task_id, title, status, sort_order)
         VALUES ($1, $2, $3, $4, 'not_started', $5)`,
        [monthId, sub.id, parentTaskId, sub.title, sub.sort_order]
      );
    }
  }
}

async function seed(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT COUNT(*) FROM task_templates');
    if (parseInt(existing.rows[0].count) === 0) {
      for (const name of TEAM_MEMBERS) {
        await client.query(
          'INSERT INTO team_members (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
          [name]
        );
      }
      for (let i = 0; i < TASK_TEMPLATES.length; i++) {
        const parent = TASK_TEMPLATES[i];
        const parentRes = await client.query(
          'INSERT INTO task_templates (title, sort_order) VALUES ($1, $2) RETURNING id',
          [parent.title, i]
        );
        const parentId = parentRes.rows[0].id;
        for (let j = 0; j < parent.subtasks.length; j++) {
          await client.query(
            'INSERT INTO task_templates (title, parent_template_id, sort_order) VALUES ($1, $2, $3)',
            [parent.subtasks[j], parentId, j]
          );
        }
      }
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthRes = await client.query(
      'INSERT INTO months (year, month) VALUES ($1, $2) ON CONFLICT (year, month) DO NOTHING RETURNING id',
      [year, month]
    );
    if (monthRes.rows.length > 0) {
      await createMonthTasks(client, monthRes.rows[0].id);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seed, createMonthTasks };
