let currentUsername: string | null = null;
let currentToken: string | null = null;
const API_BASE_URL = 'http://3.27.13.168:3000/api';

type LogLevel = 'LOG' | 'WARN' | 'ERROR';

interface QueuedEntry {
  level: LogLevel;
  message: string;
}

const queue: QueuedEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 1000;

function flushQueue() {
  flushTimer = null;
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  if (!currentToken) return;
  fetch(`${API_BASE_URL}/logs/client-log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentToken}`,
    },
    body: JSON.stringify({
      level: batch.length === 1 ? batch[0].level : 'BATCH',
      message: batch.map(e => `[${e.level}] ${e.message}`).join('\n'),
      username: currentUsername,
    }),
  }).catch(() => {});
}

function enqueue(level: LogLevel, message: string) {
  queue.push({ level, message });
  if (!flushTimer) {
    flushTimer = setTimeout(flushQueue, FLUSH_INTERVAL_MS);
  }
}

function serializeArgs(args: unknown[]): string {
  return args
    .map(a => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(' ');
}

export function setClientLoggerUser(username: string, token: string) {
  currentUsername = username;
  currentToken = token;
}

export function clearClientLoggerUser() {
  currentUsername = null;
  currentToken = null;
}

export function initClientLogger() {
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = function (...args: unknown[]) {
    origLog.apply(console, args);
    enqueue('LOG', serializeArgs(args));
  };

  console.warn = function (...args: unknown[]) {
    origWarn.apply(console, args);
    enqueue('WARN', serializeArgs(args));
  };

  console.error = function (...args: unknown[]) {
    origError.apply(console, args);
    enqueue('ERROR', serializeArgs(args));
  };
}
