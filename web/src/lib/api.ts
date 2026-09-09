const FETCH_TIMEOUT_MS = 15_000;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(path, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      signal: controller.signal,
      ...options
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((body as { error?: string }).error || res.statusText);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
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

export interface AuthStatus {
  hasUsers: boolean;
  requiresSetupToken?: boolean;
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const res = await fetch('/api/auth-status', { credentials: 'include' });
  return res.json() as Promise<AuthStatus>;
}

export async function setupAccount(username: string, password: string, setupToken?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (setupToken) {
    headers['X-Setup-Token'] = setupToken;
  }

  const res = await fetch('/api/setup', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      username,
      password,
      ...(setupToken ? { setupToken } : {})
    })
  });
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: string }).error || 'Setup failed');
  return body;
}
