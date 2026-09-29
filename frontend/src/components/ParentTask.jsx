import React, { useState } from 'react';
import SubTask from './SubTask';
import { api } from '../services/api';
import { theme } from '../theme';

const STATUS_COLORS = {
  not_started: theme.textFaint,
  in_progress: theme.warning,
  complete: theme.success,
};

const STATUS_SORT_ORDER = { not_started: 0, in_progress: 1, complete: 2 };

// Fixed across every group's table so columns line up regardless of that
// group's own content (HTML tables otherwise auto-size per table).
const COLUMN_WIDTHS = {
  title: 280,
  assignee: 130,
  due_date: 120,
  status: 140,
  notes: 220,
  action: 36,
};

function compareSubtasks(a, b, field) {
  switch (field) {
    case 'due_date': {
      const aVal = a.due_date ? a.due_date.split('T')[0] : null;
      const bVal = b.due_date ? b.due_date.split('T')[0] : null;
      if (aVal === bVal) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return aVal < bVal ? -1 : 1;
    }
    case 'assignee': {
      const aVal = a.assignee || null;
      const bVal = b.assignee || null;
      if (aVal === bVal) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return aVal.localeCompare(bVal);
    }
    case 'status':
      return STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
    case 'title':
      return a.title.localeCompare(b.title);
    case 'notes': {
      const aVal = a.notes || null;
      const bVal = b.notes || null;
      if (aVal === bVal) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return aVal.localeCompare(bVal);
    }
    default:
      return 0;
  }
}

function SortableHeader({ label, field, sortField, sortDirection, onSort, style }) {
  const isActive = sortField === field;
  return (
    <th
      style={{ ...style, cursor: 'pointer', userSelect: 'none' }}
      onClick={() => onSort(field)}
      title={`Sort by ${label}`}
    >
      {label}{isActive && <span style={{ marginLeft: 4 }}>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}

export default function ParentTask({
  task, teamMembers, onUpdate, isReadOnly, monthId, assigneeFilter,
  sortField, sortDirection, onSort,
}) {
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

  const visibleSubtasks = !assigneeFilter
    ? subtasks
    : subtasks.filter(t =>
        assigneeFilter === '__unassigned__' ? !t.assignee : t.assignee === assigneeFilter
      );

  const sortedSubtasks = [...visibleSubtasks].sort((a, b) => {
    const result = compareSubtasks(a, b, sortField);
    return sortDirection === 'desc' ? -result : result;
  });

  let rollupStatus = 'not_started';
  if (complete === total && total > 0) rollupStatus = 'complete';
  else if (complete > 0 || inProgress > 0) rollupStatus = 'in_progress';

  function reportError(err) {
    alert(err.message || 'Something went wrong.');
  }

  async function commitTitle() {
    setEditingTitle(false);
    if (titleDraft !== task.title && titleDraft.trim()) {
      try {
        await api.updateTask(task.id, { title: titleDraft });
        onUpdate();
      } catch (err) {
        reportError(err);
      }
    }
  }

  async function handleAddSubtask() {
    if (!newSubtaskTitle.trim()) return;
    try {
      await api.addSubtask(monthId, task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setAddingSubtask(false);
      onUpdate();
    } catch (err) {
      reportError(err);
    }
  }

  async function handleDeleteGroup() {
    if (!window.confirm(`Delete "${task.title}" and all its subtasks?`)) return;
    try {
      await api.deleteTask(task.id);
      onUpdate();
    } catch (err) {
      reportError(err);
    }
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

          {/* Delete group */}
          {!isReadOnly && (
            <button onClick={handleDeleteGroup} style={styles.deleteGroupBtn} title="Delete group">
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
                <SortableHeader label="Task" field="title" sortField={sortField} sortDirection={sortDirection} onSort={onSort} style={{ ...styles.th, width: COLUMN_WIDTHS.title }} />
                <SortableHeader label="Assignee" field="assignee" sortField={sortField} sortDirection={sortDirection} onSort={onSort} style={{ ...styles.th, width: COLUMN_WIDTHS.assignee }} />
                <SortableHeader label="Due Date" field="due_date" sortField={sortField} sortDirection={sortDirection} onSort={onSort} style={{ ...styles.th, width: COLUMN_WIDTHS.due_date }} />
                <SortableHeader label="Status" field="status" sortField={sortField} sortDirection={sortDirection} onSort={onSort} style={{ ...styles.th, width: COLUMN_WIDTHS.status }} />
                <SortableHeader label="Notes" field="notes" sortField={sortField} sortDirection={sortDirection} onSort={onSort} style={{ ...styles.th, width: COLUMN_WIDTHS.notes }} />
                <th style={{ ...styles.th, width: COLUMN_WIDTHS.action }} />
              </tr>
            </thead>
            <tbody>
              {sortedSubtasks.map((sub) => (
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
                  <td colSpan={6} style={{ padding: '12px 16px', color: theme.textFaint, fontSize: 13, fontStyle: 'italic' }}>
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
    background: theme.surface,
    borderRadius: theme.radiusMd,
    marginBottom: 16,
    boxShadow: theme.shadowXs,
    border: `1.5px solid ${theme.navy}`,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: theme.bgTint,
    borderBottom: `1px solid ${theme.borderStrong}`,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  chevronBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, color: theme.textMuted, padding: '0 2px', lineHeight: 1,
  },
  groupTitle: {
    fontFamily: theme.fontDisplay, fontSize: 15, fontWeight: 600, color: theme.text,
  },
  titleInput: {
    fontFamily: theme.fontDisplay, fontSize: 15, fontWeight: 600, color: theme.text,
    border: `1.5px solid ${theme.orange}`, borderRadius: theme.radiusXs,
    padding: '2px 8px', outline: 'none',
  },
  statusDot: {
    width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
  },
  progress: { fontSize: 12, color: theme.textMuted },
  miniTrack: { width: 80, height: 6, background: theme.border, borderRadius: theme.radiusPill, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: theme.radiusPill, transition: 'width 0.3s' },
  pctLabel: { fontSize: 12, color: theme.textMuted, width: 32, textAlign: 'right' },
  deleteGroupBtn: {
    background: 'none', border: 'none', color: theme.textFaint,
    fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
  },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  thead: { background: theme.bgSubtle },
  th: {
    padding: '8px 12px', textAlign: 'left',
    fontSize: 11, fontWeight: 600, color: theme.textFaint,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: `1px solid ${theme.border}`,
  },
  addRow: { padding: '8px 16px', borderTop: `1px solid ${theme.border}` },
  addForm: { display: 'flex', gap: 8, alignItems: 'center' },
  addInput: {
    flex: 1, padding: '6px 10px', border: `1.5px solid ${theme.orange}`,
    borderRadius: theme.radiusSm, fontSize: 13, outline: 'none',
  },
  addConfirmBtn: {
    background: theme.orange, color: theme.white, border: 'none',
    borderRadius: theme.radiusSm, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted,
    borderRadius: theme.radiusSm, padding: '6px 12px', fontSize: 13, cursor: 'pointer',
  },
  addSubtaskBtn: {
    background: 'none', border: 'none', color: theme.royal,
    fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '4px 0',
  },
};
