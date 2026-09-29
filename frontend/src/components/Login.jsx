import React, { useState } from 'react';
import { api } from '../services/api';
import { theme } from '../theme';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token } = await api.login(password);
      localStorage.setItem('auth_token', token);
      onLogin();
    } catch {
      setError('Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h1 style={styles.title}>Monthly Close</h1>
        <p style={styles.subtitle}>Enter your team password to continue</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={styles.input}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.bgSubtle,
  },
  card: {
    background: theme.surface,
    borderRadius: theme.radiusLg,
    padding: '48px 40px',
    width: 360,
    boxShadow: theme.shadowMd,
    textAlign: 'center',
  },
  title: {
    fontFamily: theme.fontDisplay,
    fontSize: 28,
    fontWeight: 700,
    color: theme.navy,
    marginBottom: 8,
  },
  subtitle: {
    color: theme.textMuted,
    marginBottom: 32,
    fontSize: 14,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 16px',
    borderRadius: theme.radiusSm,
    border: `1.5px solid ${theme.border}`,
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    color: theme.danger,
    fontSize: 13,
    textAlign: 'left',
  },
  button: {
    padding: '12px',
    borderRadius: theme.radiusSm,
    border: 'none',
    background: theme.orange,
    color: theme.white,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
};
