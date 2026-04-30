import React, { useState } from 'react';
import SubTask from './SubTask';
import { api } from '../services/api';

const STATUS_COLORS = {
  not_started: '#9ca3af',
  in_progress: '#f59e0b',
  complete: '#10b981',
};

export default function ParentTask({ task, teamMembers, onUpdate, isReadOnly, monthId, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const subtasks = task.subtasks || [];
  const total = subtasks.length;
  const complete = subtasks.filter(t => t.status === 'complete').length;
  const inProgress = subtasks.filter(t => t.status === 'in_progress').length;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;

  let rollupStatus = 'not_started';
  if (complete === total && total > 0) rollupStatus = 'complete';
  else if (complete > 0 || inProgress > 0) rollupStatus = 'in_progress';

  async function commitTitle() {
    setEditingTitle(false);
    if (titleDraft !== task.title && titleDraft.trim()) {
      await api.updateTask(task.id, { title: titleDraft });
      onUpdate();
    }
  }

  async function handleAddSubtask() {
    if (!newSubtaskTitle.trim()) return;
    await api.addSubtask(monthId, task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
    setAddingSubtask(false);
    onUpdate();
  }

  return (
    <div style={styles.container}>
      {/* Parent header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => setCollapsed(!collapsed)} style={styles.chevronBtn}>
            <span style={{ display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▾</span>
          </button>

          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
              style={styles.titleInput}
            />
          ) : (
            <span
              onClick={() => !isReadOnly && setEditingTitle(true)}
              style={{ ...styles.groupTitle, cursor: isReadOnly ? 'default' : 'pointer' }}
            >
              {task.title}
            </span>
          )}

          <span style={{ ...styles.statusDot, background: STATUS_COLORS[rollupStatus] }} />
          <span style={styles.progress}>{complete}/{total}</span>
        </div>

        <div style={styles.headerRight}>
          {/* Progress mini-bar */}
          <div style={styles.miniTrack}>
            <div style={{ ...styles.miniFill, width: `${pct}%`, background: STATUS_COLORS[rollupStatus] }} />
          </div>
          <span style={styles.pctLabel}>{pct}%</span>

          {/* Reorder */}
          {!isReadOnly && (
            <div style={styles.reorderBtns}>
              <button onClick={onMoveUp} disabled={isFirst} style={styles.reorderBtn} title="Move up">↑</button>
              <button onClick={onMoveDown} disabled={isLast} style={styles.reorderBtn} title="Move down">↓</button>
            </div>
          )}

          {/* Delete group */}
          {!isReadOnly && (
            <button
              onClick={() => { if (window.confirm(`Delete "${task.title}" and all its subtasks?`)) { api.deleteTask(task.id).then(onUpdate); } }}
              style={styles.deleteGroupBtn}
              title="Delete group"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Subtasks table */}
      {!collapsed && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={{ ...styles.th, minWidth: 180 }}>Task</th>
                <th style={{ ...styles.th, width: 120 }}>Assignee</th>
                <th style={{ ...styles.th, width: 130 }}>Due Date</th>
                <th style={{ ...styles.th, width: 130 }}>Status</th>
                <th style={{ ...styles.th, minWidth: 160 }}>Notes</th>
                <th style={{ ...styles.th, width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {subtasks.map((sub) => (
                <SubTask
                  key={sub.id}
                  task={sub}
                  teamMembers={teamMembers}
                  onUpdate={onUpdate}
                  onDelete={onUpdate}
                  isReadOnly={isReadOnly}
                />
              ))}
              {subtasks.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
                    No subtasks yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Add subtask row */}
          {!isReadOnly && (
            <div style={styles.addRow}>
              {addingSubtask ? (
                <div style={styles.addForm}>
                  <input
                    autoFocus
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(); if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtaskTitle(''); } }}
                    placeholder="Subtask name…"
                    style={styles.addInput}
                  />
                  <button onClick={handleAddSubtask} style={styles.addConfirmBtn}>Add</button>
                  <button onClick={() => { setAddingSubtask(false); setNewSubtaskTitle(''); }} style={styles.cancelBtn}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setAddingSubtask(true)} style={styles.addSubtaskBtn}>
                  + Add Subtask
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: '#fff',
    borderRadius: 10,
    marginBottom: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: '#f8f9fc',
    borderBottom: '1px solid #e5e7eb',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  chevronBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, color: '#6b7280', padding: '0 2px', lineHeight: 1,
  },
  groupTitle: {
    fontSize: 15, fontWeight: 700, color: '#1a1a2e',
  },
  titleInput: {
    fontSize: 15, fontWeight: 700, color: '#1a1a2e',
    border: '1.5px solid #2563eb', borderRadius: 4,
    padding: '2px 8px', outline: 'none',
  },
  statusDot: {
    width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
  },
  progress: { fontSize: 12, color: '#6b7280' },
  miniTrack: { width: 80, height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 999, transition: 'width 0.3s' },
  pctLabel: { fontSize: 12, color: '#6b7280', width: 32, textAlign: 'right' },
  reorderBtns: { display: 'flex', gap: 2 },
  reorderBtn: {
    background: 'none', border: '1px solid #e5e7eb', borderRadius: 4,
    cursor: 'pointer', padding: '1px 6px', fontSize: 12, color: '#6b7280',
    ':disabled': { opacity: 0.3 },
  },
  deleteGroupBtn: {
    background: 'none', border: 'none', color: '#d1d5db',
    fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
  },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f9fafb' },
  th: {
    padding: '8px 12px', textAlign: 'left',
    fontSize: 11, fontWeight: 600, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb',
  },
  addRow: { padding: '8px 16px', borderTop: '1px solid #f3f4f6' },
  addForm: { display: 'flex', gap: 8, alignItems: 'center' },
  addInput: {
    flex: 1, padding: '6px 10px', border: '1.5px solid #2563eb',
    borderRadius: 6, fontSize: 13, outline: 'none',
  },
  addConfirmBtn: {
    background: '#2563eb', color: '#fff', border: 'none',
    borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    background: 'none', border: '1px solid #e5e7eb', color: '#6b7280',
    borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer',
  },
  addSubtaskBtn: {
    background: 'none', border: 'none', color: '#2563eb',
    fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '4px 0',
  },
};
