/**
 * Login session + talking to the server.
 *
 * The server can live on another domain (e.g. app on GitHub Pages, API on Render):
 * set VITE_API_BASE at build time, or change it on the login screen ("Server").
 */
export interface SessionUser {
  id: string;
  login: string;
  name?: string;
  role: 'admin' | 'shopkeeper';
}
export interface SessionShop {
  id: string;
  name: string;
  city?: string;
}
export interface Session {
  token: string;
  user: SessionUser;
  shop: SessionShop | null;
}

const SESSION_KEY = 'vv_session';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (_e) {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (_e) {
    /* storage unavailable: session lasts until the tab closes */
  }
}

/** Set once at build time when the app and the server are hosted separately (GitHub Pages + Render). */
export function getServer(): string {
  return (import.meta.env.VITE_API_BASE || '').trim().replace(/\/+$/, '');
}
export const serverUrl = (path: string) => (/^https?:/.test(path) ? path : `${getServer()}${path}`);

let session: Session | null = (() => {
  try {
    const raw = read(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch (_e) {
    return null;
  }
})();
const listeners = new Set<(s: Session | null) => void>();

export const getSession = () => session;
export function setSession(s: Session | null) {
  session = s;
  write(SESSION_KEY, s ? JSON.stringify(s) : null);
  listeners.forEach((fn) => fn(s));
}
export function onSessionChange(fn: (s: Session | null) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** fetch() with the server address and login token added; logs out when the session has ended. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);
  const res = await fetch(serverUrl(path), { ...init, headers });
  if (res.status === 401 && session && !path.startsWith('/api/auth/login')) setSession(null);
  return res;
}

/** Private audio (voice signatures) needs the login token, so load it as a blob URL. */
export async function privateObjectUrl(path: string): Promise<string> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error('Could not load recording');
  return URL.createObjectURL(await res.blob());
}

export class WrongRoleError extends Error {}

/**
 * Log in. `expectRole` keeps the shop login and the admin login separate: an account of the
 * other kind is signed straight back out and a WrongRoleError is thrown.
 */
export async function login(loginName: string, password: string, expectRole?: SessionUser['role']): Promise<Session> {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginName, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.detail || 'Login failed'), { status: res.status });
  const s: Session = { token: data.data.token, user: data.data.user, shop: data.data.shop };
  if (expectRole && s.user.role !== expectRole) {
    await fetch(serverUrl('/api/auth/logout'), { method: 'POST', headers: { Authorization: `Bearer ${s.token}` } }).catch(() => {});
    throw new WrongRoleError(s.user.role);
  }
  setSession(s);
  return s;
}

export async function logout() {
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  setSession(null);
  write('vv_chat', null);
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const res = await apiFetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not change password');
}
