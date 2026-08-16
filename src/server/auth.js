const crypto = require('crypto');
const { getCookie, setCookie, deleteCookie } = require('hono/cookie');
const settingsDb = require('../db/settings');

const DESKTOP_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MOBILE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const sessions = new Map();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === derived;
}

function isConfigured() {
  const username = settingsDb.get('auth_username');
  const hash = settingsDb.get('auth_password_hash');
  return Boolean(username && hash);
}

function configureAccount(username, password) {
  if (isConfigured()) {
    throw new Error('Account already configured');
  }
  if (!username || !password || password.length < 6) {
    throw new Error('Username and password (min 6 chars) are required');
  }
  settingsDb.set('auth_username', username);
  settingsDb.set('auth_password_hash', hashPassword(password));
}

function validateCredentials(username, password) {
  const expectedUser = settingsDb.get('auth_username');
  const hash = settingsDb.get('auth_password_hash');
  if (!expectedUser || !hash) return false;
  if (username !== expectedUser) return false;
  return verifyPassword(password, hash);
}

function createSession(username, isMobile = false) {
  const ttl = isMobile ? MOBILE_SESSION_TTL_MS : DESKTOP_SESSION_TTL_MS;
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, expiresAt: Date.now() + ttl });
  return token;
}

function destroySession(token) {
  sessions.delete(token);
}

function getSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function getUserFromCookie(c) {
  const token = getCookie(c, 'session');
  if (!token) return null;
  const session = getSession(token);
  return session ? session.username : null;
}

function ensureAccountFromEnv() {
  if (isConfigured()) return;
  const envUser = process.env.DASHBOARD_USER;
  const envPassword = process.env.DASHBOARD_PASSWORD;
  if (envUser && envPassword) {
    configureAccount(envUser, envPassword);
  }
}

async function authMiddleware(c, next) {
  const path = c.req.path;
  if (path.startsWith('/static/') || path === '/login' || path === '/setup') {
    return next();
  }

  const user = getUserFromCookie(c);
  if (!user) {
    if (path.startsWith('/api/')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (isConfigured()) {
      return c.redirect('/login');
    }
    return c.redirect('/setup');
  }

  c.set('user', user);
  return next();
}

function setSessionCookie(c, token, isMobile = false) {
  const maxAge = isMobile ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
  setCookie(c, 'session', token, {
    httpOnly: true,
    path: '/',
    maxAge,
    sameSite: 'Lax'
  });
}

function clearSessionCookie(c) {
  deleteCookie(c, 'session', { path: '/' });
}

module.exports = {
  isConfigured,
  configureAccount,
  validateCredentials,
  createSession,
  destroySession,
  getUserFromCookie,
  ensureAccountFromEnv,
  authMiddleware,
  setSessionCookie,
  clearSessionCookie
};
