import React from 'react';
import { theme } from '../theme';

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
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  // Red highlighting applies to the current month only, like the table rows
  const isCurrentMonth = !!selectedMonth &&
    selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth() + 1;
  const overdue = subtasks.filter(
    t => t.due_date && t.due_date.split('T')[0] < today && t.status !== 'complete'
  ).length;
  const groups = tasks
    .filter(t => (t.subtasks || []).length > 0)
    .map(t => {
      const dueDates = t.subtasks.filter(st => st.due_date).map(st => st.due_date.split('T')[0]);
      const lastDue = dueDates.length ? dueDates.reduce((a, b) => (a > b ? a : b)) : null;
      const complete = t.subtasks.filter(st => st.status === 'complete').length;
      return {
        id: t.id,
        late: isCurrentMonth && !!lastDue && lastDue < today && complete < t.subtasks.length,
        title: t.title,
        total: t.subtasks.length,
        complete,
      };
    });
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
        <Stat label="Total" value={total} color={theme.textMuted} />
        <Stat label="Complete" value={complete} color={theme.success} />
        <Stat label="In Progress" value={inProgress} color={theme.warning} />
        <Stat label="Not Started" value={notStarted} color={theme.textFaint} />
        <Stat label="Overdue" value={overdue} color={theme.danger} />
      </div>
      {groups.length > 0 && (
        <div style={styles.cards}>
          {groups.map((g) => <GroupCard key={g.id} group={g} />)}
        </div>
      )}
    </div>
  );
}

function GroupCard({ group }) {
  const done = group.total > 0 && group.complete === group.total;
  const pct = group.total > 0 ? (group.complete / group.total) * 100 : 0;
  return (
    <div
      style={{ ...styles.card, ...(done ? styles.cardDone : null), ...(group.late ? styles.cardLate : null) }}
      title={`${group.title}: ${group.complete} of ${group.total} complete${group.late ? ' (past its last due date)' : ''}`}
    >
      <span style={styles.cardTitle}>{group.title}</span>
      <div style={styles.cardRow}>
        {done
          ? <span style={styles.cardCheck}>✓ Complete</span>
          : <span style={{ ...styles.cardCount, ...(group.late ? { color: theme.danger } : null) }}>{group.complete}/{group.total}</span>}
      </div>
      <div style={styles.cardTrack}>
        <div style={{ ...styles.cardFill, width: `${pct}%`, background: done ? theme.emerald : group.late ? theme.danger : theme.royal }} />
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
    background: theme.surface,
    borderRadius: theme.radiusMd,
    padding: '20px 24px',
    marginBottom: 20,
    boxShadow: theme.shadowXs,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthLabel: { fontFamily: theme.fontDisplay, fontSize: 16, fontWeight: 600, color: theme.text },
  pct: { fontSize: 15, fontWeight: 700, color: theme.orange },
  track: {
    height: 10,
    background: theme.border,
    borderRadius: theme.radiusPill,
    overflow: 'hidden',
    marginBottom: 16,
  },
  fill: {
    height: '100%',
    background: `linear-gradient(90deg, ${theme.royal}, ${theme.emerald})`,
    borderRadius: theme.radiusPill,
    transition: 'width 0.4s ease',
  },
  stats: { display: 'flex', gap: 32 },
  cards: {
    display: 'flex', flexWrap: 'wrap', gap: 10,
    marginTop: 18, paddingTop: 16, borderTop: `1px solid ${theme.border}`,
  },
  card: {
    width: 150, padding: '8px 12px', background: theme.bgSubtle,
    border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm,
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  cardDone: { background: '#ecfaf3', borderColor: theme.emerald },
  cardLate: { background: '#fdecee', borderColor: theme.danger },
  cardTitle: {
    fontSize: 12, fontWeight: 600, color: theme.text,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  cardRow: { display: 'flex', alignItems: 'baseline' },
  cardCount: { fontSize: 18, fontWeight: 700, color: theme.text },
  cardCheck: { fontSize: 14, fontWeight: 700, color: theme.success, lineHeight: '23px' },
  cardTrack: { height: 4, background: theme.border, borderRadius: theme.radiusPill, overflow: 'hidden' },
  cardFill: { height: '100%', borderRadius: theme.radiusPill, transition: 'width 0.4s ease' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 700 },
  statLabel: { fontSize: 11, color: theme.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 },
};
