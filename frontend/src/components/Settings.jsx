import React, { useState } from 'react';
import { api } from '../services/api';

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
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200,
    display: 'flex', justifyContent: 'flex-end',
  },
  panel: {
    background: '#fff', width: 400, height: '100%',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
  },
  title: { fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 24,
    color: '#6b7280', cursor: 'pointer', lineHeight: 1,
  },
  section: { padding: 24 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  memberList: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 },
  memberRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', background: '#f9fafb', borderRadius: 6,
    border: '1px solid #e5e7eb',
  },
  memberName: { fontSize: 14, color: '#1a1a2e' },
  removeBtn: {
    background: 'none', border: 'none', color: '#ef4444',
    fontSize: 12, cursor: 'pointer', fontWeight: 500,
  },
  addRow: { display: 'flex', gap: 8 },
  addInput: {
    flex: 1, padding: '8px 12px', border: '1.5px solid #e5e7eb',
    borderRadius: 6, fontSize: 13, outline: 'none',
  },
  addBtn: {
    background: '#2563eb', color: '#fff', border: 'none',
    borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  error: { color: '#ef4444', fontSize: 12, marginTop: 8 },
};
