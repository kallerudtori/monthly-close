import React, { useState } from 'react';
import { api } from '../services/api';
import { theme } from '../theme';

export default function Settings({ teamMembers, onUpdate, onClose }) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      await api.addTeamMember(newName.trim());
      setNewName('');
      setError('');
      onUpdate();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Remove ${name} from the team?`)) return;
    await api.deleteTeamMember(id);
    onUpdate();
  }

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Team Members</h3>
          <p style={styles.hint}>These names populate the assignee dropdown on all subtasks.</p>

          <div style={styles.memberList}>
            {teamMembers.map((m) => (
              <div key={m.id} style={styles.memberRow}>
                <span style={styles.memberName}>{m.name}</span>
                <button onClick={() => handleDelete(m.id, m.name)} style={styles.removeBtn}>Remove</button>
              </div>
            ))}
          </div>

          <div style={styles.addRow}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Add team member…"
              style={styles.addInput}
            />
            <button onClick={handleAdd} style={styles.addBtn}>Add</button>
          </div>
          {error && <p style={styles.error}>{error}</p>}
        </section>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(2,44,82,0.35)', zIndex: 200,
    display: 'flex', justifyContent: 'flex-end',
  },
  panel: {
    background: theme.surface, width: 400, height: '100%',
    boxShadow: theme.shadowLg,
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px', borderBottom: `1px solid ${theme.border}`,
  },
  title: { fontFamily: theme.fontDisplay, fontSize: 18, fontWeight: 700, color: theme.text },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 24,
    color: theme.textMuted, cursor: 'pointer', lineHeight: 1,
  },
  section: { padding: 24 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: theme.text, marginBottom: 6 },
  hint: { fontSize: 12, color: theme.textFaint, marginBottom: 16 },
  memberList: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 },
  memberRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', background: theme.bgSubtle, borderRadius: theme.radiusSm,
    border: `1px solid ${theme.border}`,
  },
  memberName: { fontSize: 14, color: theme.text },
  removeBtn: {
    background: 'none', border: 'none', color: theme.danger,
    fontSize: 12, cursor: 'pointer', fontWeight: 500,
  },
  addRow: { display: 'flex', gap: 8 },
  addInput: {
    flex: 1, padding: '8px 12px', border: `1.5px solid ${theme.border}`,
    borderRadius: theme.radiusSm, fontSize: 13, outline: 'none',
  },
  addBtn: {
    background: theme.orange, color: theme.white, border: 'none',
    borderRadius: theme.radiusSm, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  error: { color: theme.danger, fontSize: 12, marginTop: 8 },
};
