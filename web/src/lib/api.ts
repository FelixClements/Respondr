async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(`/api${path}`),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(`/api${path}`, { method: 'PUT', body: JSON.stringify(body) }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(`/api${path}`, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
};

export async function getAuthStatus() {
  const res = await fetch('/api/auth-status');
  return res.json() as Promise<{ hasUsers: boolean }>;
}

export async function setupAccount(username: string, password: string) {
  const res = await fetch('/api/setup', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: string }).error || 'Setup failed');
  return body;
}
