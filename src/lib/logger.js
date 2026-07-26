const util = require('util');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MAX_LOGS = 1000;

const logs = [];
let currentLevel = LEVELS.info;

const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};

function parseLevel(level) {
  if (level === undefined || level === null) return LEVELS.info;
  return LEVELS[level.toString().toLowerCase()] ?? LEVELS.info;
}

function levelName(level) {
  return Object.keys(LEVELS).find((k) => LEVELS[k] === level) || 'info';
}

function setLevel(level) {
  currentLevel = parseLevel(level);
}

function getLevel() {
  return levelName(currentLevel);
}

function shouldLog(level) {
  return LEVELS[level] >= currentLevel;
}

function pushLog(level, message) {
  logs.push({ ts: Date.now(), level, message: String(message) });
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
}

function formatConsole(level, message) {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${message}`;
}

function log(level, ...args) {
  const message = util.format(...args);
  if (!shouldLog(level)) return;

  pushLog(level, message);

  const original = originalConsole[level] || originalConsole.log;
  original(formatConsole(level, message));
}

function debug(...args) { log('debug', ...args); }
function info(...args) { log('info', ...args); }
function warn(...args) { log('warn', ...args); }
function error(...args) { log('error', ...args); }

function getLogs({ level, limit = 200 } = {}) {
  let result = [...logs];
  if (level) {
    const min = parseLevel(level);
    result = result.filter((entry) => LEVELS[entry.level] >= min);
  }
  if (limit && limit > 0) {
    result = result.slice(-limit);
  }
  return result;
}

function capture(level) {
  return function (...args) {
    log(level, ...args);
  };
}

console.log = capture('info');
console.info = capture('info');
console.warn = capture('warn');
console.error = capture('error');

module.exports = { setLevel, getLevel, debug, info, warn, error, getLogs };
