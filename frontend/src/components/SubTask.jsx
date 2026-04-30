import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

const STATUS_COLORS = {
  not_started: '#9ca3af',
  in_progress: '#f59e0b',
  complete: '#10b981',
};

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
};

export default function SubTask({ task, teamMembers, onUpdate, onDelete, isReadOnly }) {
  const [editing, setEditing] = useState(null); // field name being edited
  const [draft, setDraft] = useState({});
  const today = new Date().toISOString().split('T')[0];
  const dueStr = task.due_date ? task.due_date.split('T')[0] : null;
  const isOverdue = dueStr && dueStr < today && task.status !== 'complete';

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
    await api.updateTask(task.id, { [field]: value || null });
    onUpdate();
  }

  async function handleStatusChange(status) {
    if (isReadOnly) return;
    await api.updateTask(task.id, { status });
    onUpdate();
  }

  async function handleAssigneeChange(assignee) {
    if (isReadOnly) return;
    await api.updateTask(task.id, { assignee: assignee || null });
    onUpdate();
  }

  return (
    <tr style={{ background: isOverdue ? '#fff7f7' : undefined }}>
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
      <td style={styles.td}>
        <select
          value={task.assignee || ''}
          onChange={(e) => handleAssigneeChange(e.target.value)}
          disabled={isReadOnly}
          style={{ ...styles.select, color: task.assignee ? '#1a1a2e' : '#9ca3af' }}
        >
          <option value="">—</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>
      </td>

      {/* Due Date */}
      <td style={styles.td}>
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
              color: isOverdue ? '#ef4444' : dueStr ? '#1a1a2e' : '#9ca3af',
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
              color: task.notes ? '#374151' : '#d1d5db',
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
          <button
            onClick={() => { if (window.confirm('Delete this subtask?')) { api.deleteTask(task.id).then(onUpdate); } }}
            style={styles.deleteBtn}
            title="Delete"
          >
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
    borderBottom: '1px solid #f3f4f6',
    fontSize: 13,
    verticalAlign: 'middle',
  },
  editableText: {
    cursor: 'default',
    borderRadius: 4,
    padding: '2px 4px',
    display: 'inline-block',
  },
  hoverable: {
    cursor: 'pointer',
    ':hover': { background: '#f3f4f6' },
  },
  inlineInput: {
    width: '100%',
    padding: '4px 8px',
    border: '1.5px solid #2563eb',
    borderRadius: 4,
    fontSize: 13,
    outline: 'none',
    background: '#fff',
  },
  select: {
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    padding: '3px 6px',
    fontSize: 12,
    background: '#fff',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 80,
  },
  statusSelect: {
    border: '1.5px solid',
    borderRadius: 999,
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
    color: '#d1d5db',
    fontSize: 18,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
    borderRadius: 4,
    transition: 'color 0.15s',
  },
  overdueTag: {
    marginLeft: 6,
    fontSize: 10,
    background: '#fef2f2',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: 999,
    padding: '1px 6px',
    fontWeight: 600,
    verticalAlign: 'middle',
  },
};
