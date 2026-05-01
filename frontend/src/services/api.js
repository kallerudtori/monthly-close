const BASE = process.env.REACT_APP_API_URL || '';

function getToken() {
  return localStorage.getItem('auth_token');
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.reload();
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  login: (password) =>
    fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then(async (r) => {
      if (!r.ok) throw new Error('Invalid password');
      return r.json();
    }),

  logout: () => request('POST', '/auth/logout'),

  getMonths: () => request('GET', '/months'),
  ensureCurrentMonth: () => request('POST', '/months/ensure-current'),
  prepareMonth: (year, month) => request('POST', '/months/prepare', { year, month }),

  getTasksForMonth: (monthId) => request('GET', `/tasks/month/${monthId}`),
  updateTask: (id, data) => request('PATCH', `/tasks/${id}`, data),
  addParentTask: (monthId, title) => request('POST', '/tasks/parent', { monthId, title }),
  addSubtask: (monthId, parentTaskId, title) =>
    request('POST', '/tasks/subtask', { monthId, parentTaskId, title }),
  deleteTask: (id) => request('DELETE', `/tasks/${id}`),
  reorderParents: (monthId, orderedIds) =>
    request('POST', '/tasks/reorder-parents', { monthId, orderedIds }),

  getTeamMembers: () => request('GET', '/settings/team-members'),
  addTeamMember: (name) => request('POST', '/settings/team-members', { name }),
  deleteTeamMember: (id) => request('DELETE', `/settings/team-members/${id}`),
};
