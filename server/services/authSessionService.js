const DEFAULT_JWT_EXPIRES_IN = '7d';

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;
}

function parseDurationMs(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value * 1000;
  }

  const raw = String(value || '').trim();
  const match = raw.match(/^(\d+)(ms|s|m|h|d)?$/i);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  // jsonwebtoken treats numeric expiresIn values as seconds, but numeric
  // strings as milliseconds. Environment variables arrive as strings, so
  // mirror that behavior to keep authSessionExpiresAt aligned with the JWT.
  const unit = (match[2] || 'ms').toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

function getAuthSessionExpiresAt(baseTime = new Date()) {
  return new Date(baseTime.getTime() + parseDurationMs(getJwtExpiresIn()));
}

function isMonitoringSessionActive(user, now = new Date()) {
  if (!user) {
    return false;
  }

  if (user.loggedOutAt) {
    return false;
  }

  if (!user.authSessionExpiresAt) {
    return true;
  }

  const expiresAt = new Date(user.authSessionExpiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
}

module.exports = {
  getAuthSessionExpiresAt,
  getJwtExpiresIn,
  isMonitoringSessionActive,
};
