const DEFAULT_SLEEP_START_HOUR = 21;
const DEFAULT_SLEEP_END_HOUR = 7;
const DEFAULT_SLEEP_TIMEZONE = 'UTC';

function normalizeHour(value, fallback) {
  const hour = Number(value);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return fallback;
  }
  return hour;
}

function resolveTimezone(timezone) {
  if (typeof timezone !== 'string' || !timezone.trim()) {
    return DEFAULT_SLEEP_TIMEZONE;
  }

  try {
    Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
    }).format(new Date());
    return timezone;
  } catch (error) {
    return DEFAULT_SLEEP_TIMEZONE;
  }
}

function getLocalTimeParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveTimezone(timezone),
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  return {
    hour: Number(map.hour ?? '0'),
    minute: Number(map.minute ?? '0'),
    second: Number(map.second ?? '0'),
  };
}

function getSleepWindowState(user, now = new Date()) {
  const sleepTimerEnabled = user?.sleepTimerEnabled === true;
  const sleepStartHour = normalizeHour(user?.sleepStartHour, DEFAULT_SLEEP_START_HOUR);
  const sleepEndHour = normalizeHour(user?.sleepEndHour, DEFAULT_SLEEP_END_HOUR);
  const sleepTimezone = resolveTimezone(user?.sleepTimezone);

  if (!sleepTimerEnabled) {
    return {
      sleepTimerEnabled,
      sleepStartHour,
      sleepEndHour,
      sleepTimezone,
      sleepActive: false,
      secondsUntilSleepEnd: null,
    };
  }

  if (sleepStartHour === sleepEndHour) {
    return {
      sleepTimerEnabled,
      sleepStartHour,
      sleepEndHour,
      sleepTimezone,
      sleepActive: false,
      secondsUntilSleepEnd: null,
    };
  }

  const { hour, minute, second } = getLocalTimeParts(now, sleepTimezone);
  const localHourFloat = hour + minute / 60 + second / 3600;
  const crossesMidnight = sleepStartHour > sleepEndHour;
  const sleepActive = crossesMidnight
    ? localHourFloat >= sleepStartHour || localHourFloat < sleepEndHour
    : localHourFloat >= sleepStartHour && localHourFloat < sleepEndHour;

  if (!sleepActive) {
    return {
      sleepTimerEnabled,
      sleepStartHour,
      sleepEndHour,
      sleepTimezone,
      sleepActive,
      secondsUntilSleepEnd: null,
    };
  }

  let hoursUntilSleepEnd;
  if (crossesMidnight) {
    if (localHourFloat < sleepEndHour) {
      hoursUntilSleepEnd = sleepEndHour - localHourFloat;
    } else {
      hoursUntilSleepEnd = 24 - localHourFloat + sleepEndHour;
    }
  } else {
    hoursUntilSleepEnd = sleepEndHour - localHourFloat;
  }

  const secondsUntilSleepEnd = Math.max(0, Math.ceil(hoursUntilSleepEnd * 60 * 60));

  return {
    sleepTimerEnabled,
    sleepStartHour,
    sleepEndHour,
    sleepTimezone,
    sleepActive,
    secondsUntilSleepEnd,
  };
}

function getEffectiveDndState(user, now = new Date()) {
  if (user?.dnd === true) {
    return {
      effectiveDnd: true,
      dndReason: 'manual',
      sleepActive: false,
      sleepState: getSleepWindowState(user, now),
    };
  }

  const sleepState = getSleepWindowState(user, now);
  if (sleepState.sleepActive) {
    return {
      effectiveDnd: true,
      dndReason: 'sleep',
      sleepActive: true,
      sleepState,
    };
  }

  return {
    effectiveDnd: false,
    dndReason: null,
    sleepActive: false,
    sleepState,
  };
}

module.exports = {
  DEFAULT_SLEEP_START_HOUR,
  DEFAULT_SLEEP_END_HOUR,
  DEFAULT_SLEEP_TIMEZONE,
  getSleepWindowState,
  getEffectiveDndState,
  resolveTimezone,
};
