import React from 'react';
import { theme } from '../theme';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function Nav({ months, selectedMonthId, onSelectMonth, onOpenSettings, onLogout, onPrepareNextMonth, isReadOnly, onCopyFromPrevious }) {
  // Determine if next month already exists
  const now = new Date();
  const nextMonth = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
  const nextYear = now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear();
  const nextMonthExists = months.some(m => m.month === nextMonth && m.year === nextYear);
  const nextMonthName = `${MONTH_NAMES[nextMonth - 1]} ${nextYear}`;

  const selectedMonth = months.find(m => m.id === selectedMonthId);
  const prevMonth = selectedMonth ? (selectedMonth.month === 1 ? 12 : selectedMonth.month - 1) : null;
  const prevYear = selectedMonth ? (selectedMonth.month === 1 ? selectedMonth.year - 1 : selectedMonth.year) : null;
  const prevMonthName = prevMonth ? `${MONTH_NAMES[prevMonth - 1]} ${prevYear}` : '';

  return (
    <nav style={styles.nav}>
      <div style={styles.left}>
        <span style={styles.logo}>Monthly Close</span>
        {months.length > 0 && (
          <select
            value={selectedMonthId || ''}
            onChange={(e) => onSelectMonth(parseInt(e.target.value))}
            style={styles.select}
          >
            {months.map((m) => (
              <option key={m.id} value={m.id}>
                {MONTH_NAMES[m.month - 1]} {m.year}
              </option>
            ))}
          </select>
        )}
        {!nextMonthExists && (
          <button onClick={onPrepareNextMonth} style={styles.prepareBtn} title={`Set up ${nextMonthName} checklist early`}>
            + Prepare {nextMonthName}
          </button>
        )}
        {!isReadOnly && selectedMonth && (
          <button
            onClick={onCopyFromPrevious}
            style={styles.copyLink}
            title={`Copy assignees & due dates from ${prevMonthName}`}
          >
            ↙ copy from {MONTH_NAMES[prevMonth - 1]}
          </button>
        )}
      </div>
      <div style={styles.right}>
        <button onClick={onOpenSettings} style={styles.iconBtn} title="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <button onClick={onLogout} style={styles.logoutBtn}>Sign Out</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    height: 60,
    background: theme.navy,
    boxShadow: theme.shadowSm,
  },
  left: { display: 'flex', alignItems: 'center', gap: 16 },
  logo: {
    fontFamily: theme.fontDisplay,
    fontSize: 18,
    fontWeight: 700,
    color: theme.textOnDark,
    letterSpacing: '-0.3px',
  },
  select: {
    padding: '6px 12px',
    borderRadius: theme.radiusSm,
    border: `1.5px solid ${theme.royal}`,
    background: theme.navyDeep,
    color: theme.textOnDark,
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none',
  },
  prepareBtn: {
    background: 'none',
    border: `1.5px solid ${theme.royal}`,
    color: theme.textOnDarkMuted,
    fontSize: 12,
    fontWeight: 500,
    padding: '5px 12px',
    borderRadius: theme.radiusSm,
    cursor: 'pointer',
  },
  copyLink: {
    background: 'none',
    border: 'none',
    color: theme.textOnDarkMuted,
    fontSize: 12,
    padding: '4px 2px',
    cursor: 'pointer',
    textDecoration: 'underline',
    textDecorationStyle: 'dotted',
  },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: theme.textOnDarkMuted,
    cursor: 'pointer',
    padding: 6,
    borderRadius: theme.radiusSm,
    display: 'flex',
    alignItems: 'center',
  },
  logoutBtn: {
    background: 'none',
    border: `1.5px solid ${theme.royal}`,
    color: theme.textOnDarkMuted,
    fontSize: 13,
    padding: '5px 12px',
    borderRadius: theme.radiusSm,
    cursor: 'pointer',
  },
};
