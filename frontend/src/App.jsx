import React, { useState, useEffect, useCallback, useRef } from 'react';
import Login from './components/Login';
import Nav from './components/Nav';
import ProgressBar from './components/ProgressBar';
import ParentTask from './components/ParentTask';
import Settings from './components/Settings';
import { api } from './services/api';

const POLL_INTERVAL = 30000;

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('auth_token'));
  const [months, setMonths] = useState([]);
  const [selectedMonthId, setSelectedMonthId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [addGroupError, setAddGroupError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);
  const pollRef = useRef(null);

  const loadTasks = useCallback(async (monthId) => {
    if (!monthId) return;
    try {
      const { tasks, isReadOnly } = await api.getTasksForMonth(monthId);
      setTasks(tasks);
      setIsReadOnly(isReadOnly);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }, []);

  const loadMonths = useCallback(async () => {
    const data = await api.getMonths();
    setMonths(data);
    return data;
  }, []);

  const loadTeamMembers = useCallback(async () => {
    const data = await api.getTeamMembers();
    setTeamMembers(data);
  }, []);

  const init = useCallback(async () => {
    try {
      await api.ensureCurrentMonth();
      const data = await loadMonths();
      const current = data[0];
      if (current) {
        setSelectedMonthId(current.id);
        await loadTasks(current.id);
      }
      await loadTeamMembers();
      setInitError(null);
    } catch (err) {
      console.error('Init error:', err);
      setInitError(
        'Could not connect to the server. Make sure the backend is running and your DATABASE_URL is set.'
      );
    } finally {
      setLoading(false);
    }
  }, [loadMonths, loadTasks, loadTeamMembers]);

  useEffect(() => {
    if (!authed) return;
    init();
  }, [authed, init]);

  // Polling
  useEffect(() => {
    if (!authed || !selectedMonthId) return;
    pollRef.current = setInterval(() => {
      loadTasks(selectedMonthId);
    }, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [authed, selectedMonthId, loadTasks]);

  async function handleSelectMonth(id) {
    setSelectedMonthId(id);
    await loadTasks(id);
  }

  async function handleUpdate() {
    await loadTasks(selectedMonthId);
  }

  async function handleTeamUpdate() {
    await loadTeamMembers();
  }

  async function handleAddGroup() {
    if (!newGroupTitle.trim()) return;
    setAddGroupError(null);
    try {
      await api.addParentTask(selectedMonthId, newGroupTitle.trim());
      setNewGroupTitle('');
      setAddingGroup(false);
      await loadTasks(selectedMonthId);
    } catch (err) {
      setAddGroupError(err.message);
    }
  }

  async function handlePrepareNextMonth() {
    const now = new Date();
    const nextMonth = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
    const nextYear = now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear();
    try {
      const newMonth = await api.prepareMonth(nextYear, nextMonth);
      const data = await loadMonths();
      setSelectedMonthId(newMonth.id);
      await loadTasks(newMonth.id);
    } catch (err) {
      alert('Failed to prepare next month: ' + err.message);
    }
  }

  async function handleMoveGroup(index, direction) {
    const newTasks = [...tasks];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newTasks.length) return;
    [newTasks[index], newTasks[swapIndex]] = [newTasks[swapIndex], newTasks[index]];
    setTasks(newTasks);
    try {
      await api.reorderParents(selectedMonthId, newTasks.map(t => t.id));
    } catch (err) {
      console.error('Reorder failed:', err);
    }
  }

  function handleLogout() {
    api.logout().catch(() => {});
    localStorage.removeItem('auth_token');
    setAuthed(false);
  }

  const selectedMonth = months.find(m => m.id === selectedMonthId);

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />;
  }

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
        <p style={{ color: '#6b7280', marginTop: 16 }}>Loading…</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.errorCard}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
            Connection Error
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>{initError}</p>
          <button onClick={init} style={styles.retryBtn}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <Nav
        months={months}
        selectedMonthId={selectedMonthId}
        onSelectMonth={handleSelectMonth}
        onOpenSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
        onPrepareNextMonth={handlePrepareNextMonth}
      />

      <main style={styles.main}>
        <ProgressBar tasks={tasks} selectedMonth={selectedMonth} />

        {isReadOnly && (
          <div style={styles.readOnlyBanner}>
            This month is read-only. Only the current month can be edited.
          </div>
        )}

        {tasks.map((task, i) => (
          <ParentTask
            key={task.id}
            task={task}
            teamMembers={teamMembers}
            onUpdate={handleUpdate}
            isReadOnly={isReadOnly}
            monthId={selectedMonthId}
            onMoveUp={() => handleMoveGroup(i, -1)}
            onMoveDown={() => handleMoveGroup(i, 1)}
            isFirst={i === 0}
            isLast={i === tasks.length - 1}
          />
        ))}

        {!isReadOnly && (
          <div style={styles.addGroupSection}>
            {addingGroup ? (
              <div>
                <div style={styles.addGroupForm}>
                  <input
                    autoFocus
                    value={newGroupTitle}
                    onChange={(e) => setNewGroupTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddGroup();
                      if (e.key === 'Escape') { setAddingGroup(false); setNewGroupTitle(''); setAddGroupError(null); }
                    }}
                    placeholder="Group name…"
                    style={styles.addGroupInput}
                  />
                  <button onClick={handleAddGroup} style={styles.addConfirmBtn}>Add Group</button>
                  <button onClick={() => { setAddingGroup(false); setNewGroupTitle(''); setAddGroupError(null); }} style={styles.cancelBtn}>Cancel</button>
                </div>
                {addGroupError && (
                  <p style={{ color: '#dc2626', fontSize: 13, marginTop: 6 }}>Error: {addGroupError}</p>
                )}
              </div>
            ) : (
              <button onClick={() => setAddingGroup(true)} style={styles.addGroupBtn}>
                + Add Task Group
              </button>
            )}
          </div>
        )}
      </main>

      {showSettings && (
        <Settings
          teamMembers={teamMembers}
          onUpdate={handleTeamUpdate}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

const styles = {
  app: { minHeight: '100vh', background: '#f5f6fa' },
  main: { maxWidth: 1200, margin: '0 auto', padding: '24px 32px' },
  loadingScreen: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  },
  errorCard: {
    background: '#fff', borderRadius: 12, padding: '32px 40px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)', textAlign: 'center', maxWidth: 420,
  },
  retryBtn: {
    background: '#2563eb', color: '#fff', border: 'none',
    borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  spinner: {
    width: 36, height: 36, border: '3px solid #e5e7eb',
    borderTopColor: '#2563eb', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  readOnlyBanner: {
    background: '#fef9c3', border: '1px solid #fde047',
    borderRadius: 8, padding: '10px 16px',
    fontSize: 13, color: '#854d0e', marginBottom: 16,
  },
  addGroupSection: { marginTop: 8 },
  addGroupForm: { display: 'flex', gap: 8, alignItems: 'center' },
  addGroupInput: {
    flex: 1, maxWidth: 300, padding: '10px 14px',
    border: '1.5px solid #2563eb', borderRadius: 8,
    fontSize: 14, outline: 'none', background: '#fff',
  },
  addConfirmBtn: {
    background: '#2563eb', color: '#fff', border: 'none',
    borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    background: 'none', border: '1px solid #e5e7eb', color: '#6b7280',
    borderRadius: 8, padding: '10px 14px', fontSize: 14, cursor: 'pointer',
  },
  addGroupBtn: {
    background: 'none', border: '2px dashed #d1d5db', color: '#6b7280',
    borderRadius: 10, padding: '14px 24px', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', width: '100%', textAlign: 'center',
    transition: 'border-color 0.2s, color 0.2s',
  },
};
