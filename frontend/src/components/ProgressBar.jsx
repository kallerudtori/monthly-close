import React from 'react';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function ProgressBar({ tasks, selectedMonth }) {
  const subtasks = tasks.flatMap(t => t.subtasks || []);
  const total = subtasks.length;
  const complete = subtasks.filter(t => t.status === 'complete').length;
  const inProgress = subtasks.filter(t => t.status === 'in_progress').length;
  const notStarted = subtasks.filter(t => t.status === 'not_started').length;
  const today = new Date().toISOString().split('T')[0];
  const overdue = subtasks.filter(
    t => t.due_date && t.due_date.split('T')[0] < today && t.status !== 'complete'
  ).length;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;

  const monthLabel = selectedMonth
    ? `${MONTH_NAMES[selectedMonth.month - 1]} ${selectedMonth.year}`
    : '';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.monthLabel}>{monthLabel}</span>
        <span style={styles.pct}>{pct}% Complete</span>
      </div>
      <div style={styles.track}>
        <div style={{ ...styles.fill, width: `${pct}%` }} />
      </div>
      <div style={styles.stats}>
        <Stat label="Total" value={total} color="#6b7280" />
        <Stat label="Complete" value={complete} color="#10b981" />
        <Stat label="In Progress" value={inProgress} color="#f59e0b" />
        <Stat label="Not Started" value={notStarted} color="#9ca3af" />
        <Stat label="Overdue" value={overdue} color="#ef4444" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={styles.stat}>
      <span style={{ ...styles.statValue, color }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

const styles = {
  container: {
    background: '#fff',
    borderRadius: 10,
    padding: '20px 24px',
    marginBottom: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthLabel: { fontSize: 16, fontWeight: 600, color: '#1a1a2e' },
  pct: { fontSize: 15, fontWeight: 700, color: '#2563eb' },
  track: {
    height: 10,
    background: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 16,
  },
  fill: {
    height: '100%',
    background: 'linear-gradient(90deg, #2563eb, #10b981)',
    borderRadius: 999,
    transition: 'width 0.4s ease',
  },
  stats: { display: 'flex', gap: 32 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 700 },
  statLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 },
};
