const { getEffectiveDndState } = require('./sleepWindowService');

function buildUserResponse(user, now = new Date()) {
  if (!user) {
    return null;
  }

  const raw = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete raw.password;

  const effectiveState = getEffectiveDndState(raw, now);

  return {
    ...raw,
    id: raw.id || (raw._id ? raw._id.toString() : undefined),
    dnd: raw.dnd === true,
    sleepTimerEnabled: raw.sleepTimerEnabled === true,
    sleepStartHour: Number.isInteger(raw.sleepStartHour) ? raw.sleepStartHour : 21,
    sleepEndHour: Number.isInteger(raw.sleepEndHour) ? raw.sleepEndHour : 7,
    sleepTimezone: typeof raw.sleepTimezone === 'string' && raw.sleepTimezone ? raw.sleepTimezone : 'UTC',
    effectiveDnd: effectiveState.effectiveDnd,
    dndReason: effectiveState.dndReason,
  };
}

module.exports = {
  buildUserResponse,
};
