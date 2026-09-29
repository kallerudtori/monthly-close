import React, { useState } from 'react';
import { api } from '../services/api';
import { theme } from '../theme';

const STATUS_COLORS = {
  not_started: theme.textFaint,
  in_progress: theme.warning,
  complete: theme.success,
};

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
};

function reportError(err) {
  alert(err.message || 'Something went wrong.');
}

export default function SubTask({ task, teamMembers, onUpdate, onDelete, isReadOnly }) {
  const [editing, setEditing] = useState(null); // field name being edited
  const [draft, setDraft] = useState({});
  const today = new Date().toISOString().split('T')[0];
  const dueStr = task.due_date ? task.due_date.split('T')[0] : null;
  const isOverdue = dueStr && dueStr < today && task.status !== 'complete';
  const isUnassigned = !isReadOnly && !task.assignee;
  const isMissingDueDate = !isReadOnly && !dueStr;

  function startEdit(field, value) {
    if (isReadOnly) return;
    setEditing(field);
    setDraft({ [field]: value ?? '' });
  }

  async function commitEdit(field) {
    if (editing !== field) return;
    setEditing(null);
    const value = draft[field];
    const current = field === 'due_date' ? dueStr : task[field];
    if (value === current || (value === '' && current == null)) return;
    try {
      await api.updateTask(task.id, { [field]: value || null });
      onUpdate();
    } catch (err) {
      reportError(err);
    }
  }

  async function handleStatusChange(status) {
    if (isReadOnly) return;
    try {
      await api.updateTask(task.id, { status });
      onUpdate();
    } catch (err) {
      reportError(err);
    }
  }

  async function handleAssigneeChange(assignee) {
    if (isReadOnly) return;
    try {
      await api.updateTask(task.id, { assignee: assignee || null });
      onUpdate();
    } catch (err) {
      reportError(err);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this subtask?')) return;
    try {
      await api.deleteTask(task.id);
      onUpdate();
    } catch (err) {
      reportError(err);
    }
  }

  return (
    <tr style={{ background: isOverdue ? 'rgba(215,38,61,0.05)' : undefined }}>
      {/* Title */}
      <td style={styles.td}>
        {editing === 'title' ? (
          <input
            autoFocus
            value={draft.title}
            onChange={(e) => setDraft({ title: e.target.value })}
            onBlur={() => commitEdit('title')}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit('title'); if (e.key === 'Escape') setEditing(null); }}
            style={styles.inlineInput}
          />
        ) : (
          <span
            onClick={() => startEdit('title', task.title)}
            style={{ ...styles.editableText, ...(isReadOnly ? {} : styles.hoverable) }}
          >
            {task.title}
          </span>
        )}
      </td>

      {/* Assignee */}
      <td style={{ ...styles.td, ...(isUnassigned ? styles.unassignedCell : {}) }}>
        <select
          value={task.assignee || ''}
          onChange={(e) => handleAssigneeChange(e.target.value)}
          disabled={isReadOnly}
          style={{ ...styles.select, color: task.assignee ? theme.text : theme.textFaint }}
        >
          <option value="">—</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>
      </td>

      {/* Due Date */}
      <td style={{ ...styles.td, ...(isMissingDueDate ? styles.missingDateCell : {}) }}>
        {editing === 'due_date' ? (
          <input
            type="date"
            autoFocus
            value={draft.due_date}
            onChange={(e) => setDraft({ due_date: e.target.value })}
            onBlur={() => commitEdit('due_date')}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }}
            style={styles.inlineInput}
          />
        ) : (
          <span
            onClick={() => startEdit('due_date', dueStr || '')}
            style={{
              ...styles.editableText,
              ...(isReadOnly ? {} : styles.hoverable),
              color: isOverdue ? theme.danger : dueStr ? theme.text : theme.textFaint,
              fontWeight: isOverdue ? 600 : undefined,
            }}
          >
            {dueStr ? formatDate(dueStr) : '—'}
            {isOverdue && <span style={styles.overdueTag}>Overdue</span>}
          </span>
        )}
      </td>

      {/* Status */}
      <td style={styles.td}>
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isReadOnly}
          style={{
            ...styles.statusSelect,
            background: STATUS_COLORS[task.status] + '22',
            color: STATUS_COLORS[task.status],
            borderColor: STATUS_COLORS[task.status] + '55',
          }}
        >
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </td>

      {/* Notes */}
      <td style={styles.td}>
        {editing === 'notes' ? (
          <textarea
            autoFocus
            value={draft.notes}
            onChange={(e) => setDraft({ notes: e.target.value })}
            onBlur={() => commitEdit('notes')}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }}
            style={{ ...styles.inlineInput, minHeight: 60, resize: 'vertical' }}
          />
        ) : (
          <span
            onClick={() => startEdit('notes', task.notes || '')}
            style={{
              ...styles.editableText,
              ...(isReadOnly ? {} : styles.hoverable),
              color: task.notes ? theme.text : theme.textFaint,
              fontStyle: task.notes ? 'normal' : 'italic',
              fontSize: 12,
              maxWidth: 200,
              display: 'inline-block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              verticalAlign: 'middle',
            }}
            title={task.notes || ''}
          >
            {task.notes || 'Add note…'}
          </span>
        )}
      </td>

      {/* Delete */}
      <td style={{ ...styles.td, width: 36 }}>
        {!isReadOnly && (
          <button onClick={handleDelete} style={styles.deleteBtn} title="Delete">
            ×
          </button>
        )}
      </td>
    </tr>
  );
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`;
}

const styles = {
  td: {
    padding: '8px 12px',
    borderBottom: `1px solid ${theme.border}`,
    fontSize: 13,
    verticalAlign: 'middle',
  },
  unassignedCell: {
    background: theme.lavender,
    boxShadow: `inset 3px 0 0 ${theme.royal}`,
  },
  missingDateCell: {
    background: theme.lemon,
    boxShadow: `inset 3px 0 0 ${theme.warning}`,
  },
  editableText: {
    cursor: 'default',
    borderRadius: theme.radiusXs,
    padding: '2px 4px',
    display: 'inline-block',
  },
  hoverable: {
    cursor: 'pointer',
    ':hover': { background: theme.bgSubtle },
  },
  inlineInput: {
    width: '100%',
    padding: '4px 8px',
    border: `1.5px solid ${theme.orange}`,
    borderRadius: theme.radiusXs,
    fontSize: 13,
    outline: 'none',
    background: theme.white,
  },
  select: {
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radiusXs,
    padding: '3px 6px',
    fontSize: 12,
    background: theme.white,
    cursor: 'pointer',
    outline: 'none',
    minWidth: 80,
  },
  statusSelect: {
    border: '1.5px solid',
    borderRadius: theme.radiusPill,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    outline: 'none',
    minWidth: 100,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: theme.textFaint,
    fontSize: 18,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
    borderRadius: theme.radiusXs,
    transition: 'color 0.15s',
  },
  overdueTag: {
    marginLeft: 6,
    fontSize: 10,
    background: '#fdecee',
    color: theme.danger,
    border: `1px solid ${theme.danger}55`,
    borderRadius: theme.radiusPill,
    padding: '1px 6px',
    fontWeight: 600,
    verticalAlign: 'middle',
  },
};
