const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'client-logs.txt');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function appendClientLog(username, level, message) {
  try {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${username}] [${level}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (err) {
    console.error('[clientLogService] Failed to write log:', err.message);
  }
}

module.exports = { appendClientLog };
