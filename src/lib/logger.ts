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
    logs.splice(0, logs.length - MAX_LOGS);
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

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevelName = (typeof LOG_LEVELS)[number];

export function isLogLevel(value: unknown): value is LogLevelName {
  return typeof value === 'string' && (LOG_LEVELS as readonly string[]).includes(value.toLowerCase());
}

export function getLogs({ level, limit = 200 }: { level?: string; limit?: number } = {}): LogEntry[] {
  const take = Math.min(Math.max(Number.isFinite(limit as number) ? (limit as number) : 200, 1), 1000);
  const min = level ? parseLevel(level) : null;
  const result: LogEntry[] = [];
  for (let i = logs.length - 1; i >= 0 && result.length < take; i--) {
    const entry = logs[i];
    if (min === null || LEVELS[entry.level] >= min) {
      result.push(entry);
    }
  }
  return result.reverse();
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
