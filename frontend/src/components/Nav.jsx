import React from 'react';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function Nav({ months, selectedMonthId, onSelectMonth, onOpenSettings, onLogout, onPrepareNextMonth }) {
  // Determine if next month already exists
  const now = new Date();
  const nextMonth = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
  const nextYear = now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear();
  const nextMonthExists = months.some(m => m.month === nextMonth && m.year === nextYear);
  const nextMonthName = `${MONTH_NAMES[nextMonth - 1]} ${nextYear}`;

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
      </div>
      <div style={styles.right}>
        <button onClick={onOpenSettings} style={styles.iconBtn} title="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
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
    background: '#1a1a2e',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  left: { display: 'flex', alignItems: 'center', gap: 16 },
  logo: { fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' },
  select: {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1.5px solid #374151',
    background: '#2d2d44',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none',
  },
  prepareBtn: {
    background: 'none',
    border: '1.5px solid #4b5563',
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 500,
    padding: '5px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
  },
  logoutBtn: {
    background: 'none',
    border: '1.5px solid #374151',
    color: '#9ca3af',
    fontSize: 13,
    padding: '5px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
