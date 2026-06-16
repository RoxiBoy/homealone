const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFilename(type) {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `${date}-${type}.txt`);
}

function appendLog(username, level, message, type) {
  try {
    ensureLogDir();
    const filePath = getLogFilename(type);
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${username}] [${level}] ${message}\n`;
    fs.appendFileSync(filePath, line, 'utf8');
  } catch (err) {
    console.error(`[clientLogService] Failed to write ${type} log:`, err.message);
  }
}

function appendClientLog(username, level, message) {
  appendLog(username, level, message, 'client');
}

function appendServerLog(level, message) {
  appendLog('-', level, message, 'server');
}

module.exports = { appendClientLog, appendServerLog, appendLog };
