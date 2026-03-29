const DEFAULT_INTERVAL_HOURS = 2;
const DEFAULT_HARD_DEADLINE_HOURS = 4;

function getIntervalMs(intervalHours) {
  const hours = Number(intervalHours ?? DEFAULT_INTERVAL_HOURS);
  if (!Number.isFinite(hours) || hours <= 0) {
    return null;
  }
  return Math.round(hours * 60 * 60 * 1000);
}

function getHardDeadlineMs() {
  const maxHours = Number(process.env.CHECKIN_MAX_SNOOZE_HOURS || DEFAULT_HARD_DEADLINE_HOURS);
  if (!Number.isFinite(maxHours) || maxHours <= 0) {
    return DEFAULT_HARD_DEADLINE_HOURS * 60 * 60 * 1000;
  }
  return Math.round(maxHours * 60 * 60 * 1000);
}

function armCheckInWindow(user, baseTime = new Date()) {
  const intervalMs = getIntervalMs(user.checkInIntervalHours);
  if (!intervalMs) {
    return null;
  }

  const nextCheckInAt = new Date(baseTime.getTime() + intervalMs);
  const checkInHardDeadlineAt = new Date(nextCheckInAt.getTime() + getHardDeadlineMs());

  user.nextCheckInAt = nextCheckInAt;
  user.checkInHardDeadlineAt = checkInHardDeadlineAt;

  return { nextCheckInAt, checkInHardDeadlineAt };
}

module.exports = {
  armCheckInWindow,
  getIntervalMs,
  getHardDeadlineMs,
};
