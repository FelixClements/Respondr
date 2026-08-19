import util from 'node:util';
import type { LogEntry, LogLevel } from '../types.js';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MAX_LOGS = 1000;

const logs: LogEntry[] = [];
let currentLevel = LEVELS.info;

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console)
};

function parseLevel(level: string | undefined | null): number {
  if (level === undefined || level === null) return LEVELS.info;
  return LEVELS[level.toString().toLowerCase() as LogLevel] ?? LEVELS.info;
}

function levelName(level: number): LogLevel {
  return (Object.keys(LEVELS) as LogLevel[]).find((k) => LEVELS[k] === level) || 'info';
}

export function setLevel(level: string): void {
  currentLevel = parseLevel(level);
}

export function getLevel(): LogLevel {
  return levelName(currentLevel);
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= currentLevel;
}

function pushLog(level: LogLevel, message: string): void {
  logs.push({ ts: Date.now(), level, message: String(message) });
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
}

function formatConsole(level: LogLevel, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${message}`;
}

function log(level: LogLevel, ...args: unknown[]): void {
  const message = util.format(...args);
  if (!shouldLog(level)) return;

  pushLog(level, message);

  const original = originalConsole[level] || originalConsole.log;
  original(formatConsole(level, message));
}

export function debug(...args: unknown[]): void {
  log('debug', ...args);
}
export function info(...args: unknown[]): void {
  log('info', ...args);
}
export function warn(...args: unknown[]): void {
  log('warn', ...args);
}
export function error(...args: unknown[]): void {
  log('error', ...args);
}

export function getLogs({ level, limit = 200 }: { level?: string; limit?: number } = {}): LogEntry[] {
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

function capture(level: LogLevel) {
  return (...args: unknown[]) => {
    log(level, ...args);
  };
}

console.log = capture('info');
console.info = capture('info');
console.warn = capture('warn');
console.error = capture('error');
console.debug = capture('debug');
