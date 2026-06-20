const User = require('./models/User');
const CheckInSession = require('./models/CheckInSession');
const { sendCheckInNotification } = require('./services/pushService');
const { initiateEmergencyProtocol } = require('./services/emergencyProtocolService');
const { getEffectiveDndState } = require('./services/sleepWindowService');
const { armCheckInWindowRespectingSleep } = require('./services/checkInWindowService');
const {
  clearCheckInSchedule,
  hasActiveSubscription,
} = require('./services/subscriptionAccessService');

const SCHEDULER_INTERVAL_MS = 5000; // run every 60 seconds
const parsedActiveStateFreshMs = Number(process.env.ACTIVE_STATE_FRESH_MS);
const ACTIVE_STATE_FRESH_MS =
  Number.isFinite(parsedActiveStateFreshMs) && parsedActiveStateFreshMs > 0
    ? parsedActiveStateFreshMs
    : 2 * 60 * 1000;

function isFreshActiveState(user, now) {
  if (user.isActive !== true || !user.lastActiveAt) {
    return false;
  }

  const lastActiveAt = new Date(user.lastActiveAt);
  if (Number.isNaN(lastActiveAt.getTime())) {
    return false;
  }

  return now.getTime() - lastActiveAt.getTime() <= ACTIVE_STATE_FRESH_MS;
}

async function schedulerTick() {
  const now = new Date();
  try {
    // Clear stale isActive flags — app may have crashed while in foreground,
    // leaving isActive=true with an old timestamp that would suppress check-ins.
    await User.updateMany(
      {
        isActive: true,
        lastActiveAt: { $lte: new Date(now.getTime() - ACTIVE_STATE_FRESH_MS * 3) },
      },
      { $set: { isActive: false } },
    ).exec();

    const overdueSessions = await CheckInSession.find({
      status: 'pending',
      responseDeadline: { $lte: now },
    }).exec();

    for (const session of overdueSessions) {
      try {
        await initiateEmergencyProtocol({
          sessionId: session._id,
          userId: session.user,
          reason: 'scheduler-timeout',
        });
      } catch (err) {
        console.error(
          '[CheckInScheduler] Error escalating overdue session',
          session._id.toString(),
          err,
        );
      }
    }

    const pendingUsers = await User.find({
      checkInStatus: 'pending',
    }).exec();

    for (const user of pendingUsers) {
      try {
        if (!hasActiveSubscription(user, now)) {
          const pendingSession = await CheckInSession.findOne({
            user: user._id,
            status: 'pending',
          })
            .sort({ createdAt: -1 })
            .exec();

          if (pendingSession) {
            pendingSession.status = 'expired';
            pendingSession.resolutionReason = 'suppressed';
            pendingSession.resolvedAt = now;
            await pendingSession.save();
          }

          clearCheckInSchedule(user);
          await user.save();
          continue;
        }

        const effectiveState = getEffectiveDndState(user, now);
        if (effectiveState.effectiveDnd !== true) {
          continue;
        }

        const pendingSession = await CheckInSession.findOne({
          user: user._id,
          status: 'pending',
        })
          .sort({ createdAt: -1 })
          .exec();

        if (!pendingSession) {
          user.checkInStatus = 'ok';
          await user.save();
          continue;
        }

        pendingSession.status = 'expired';
        pendingSession.resolutionReason =
          effectiveState.dndReason === 'sleep' ? 'sleep_window' : 'suppressed';
        pendingSession.resolvedAt = now;
        await pendingSession.save();

        user.checkInStatus = 'ok';
        if (effectiveState.dndReason === 'sleep') {
          armCheckInWindowRespectingSleep(user, now);
        } else {
          user.nextCheckInAt = null;
          user.checkInHardDeadlineAt = null;
        }
        await user.save();

        console.log(
          '[CheckInScheduler] Cancelled pending check-in due to DND for user',
          user._id.toString(),
          'reason',
          effectiveState.dndReason,
          'session',
          pendingSession._id.toString(),
        );
      } catch (err) {
        console.error(
          '[CheckInScheduler] Error cancelling pending sleep-window session for user',
          user._id.toString(),
          err,
        );
      }
    }

    // Find users who are not currently in emergency and whose nextCheckInAt is due
    const dueUsers = await User.find({
      checkInStatus: { $ne: 'emergency' },
      nextCheckInAt: { $ne: null, $lte: now },
    }).exec();

    if (!dueUsers.length) {
      return;
    }

    console.log('[CheckInScheduler] Found', dueUsers.length, 'user(s) with due check-ins at', now.toISOString());

    for (const user of dueUsers) {
      try {
        const intervalHours = user.checkInIntervalHours ?? 2;
        const countdownMinutes = user.emergencyCountdownMinutes ?? 2;

        if (!hasActiveSubscription(user, now)) {
          console.log(
            '[CheckInScheduler] Subscription inactive - clearing scheduled check-in for user',
            user._id.toString(),
          );
          clearCheckInSchedule(user);
          await user.save();
          continue;
        }

        if (!intervalHours || intervalHours <= 0) {
          console.log('[CheckInScheduler] Skipping user', user._id.toString(), 'invalid interval', intervalHours);
          continue;
        }

        // 1) DND: disable check-in alerts entirely
        const effectiveState = getEffectiveDndState(user, now);

        if (effectiveState.effectiveDnd === true) {
          console.log(
            '[CheckInScheduler] DND enabled - skipping check-in for user',
            user._id.toString(),
            'reason',
            effectiveState.dndReason,
          );

          if (effectiveState.dndReason === 'manual') {
            user.checkInStatus = 'ok';
            user.nextCheckInAt = null;
            user.checkInHardDeadlineAt = null;
          } else {
            armCheckInWindowRespectingSleep(user, now);
          }

          await user.save();
          continue;
        }

        if (isFreshActiveState(user, now)) {
          console.log(
            '[CheckInScheduler] App active - resetting check-in window for user',
            user._id.toString(),
          );
          user.checkInStatus = 'ok';
          armCheckInWindowRespectingSleep(user, now);
          await user.save();
          continue;
        }

        if (user.isActive === true) {
          console.log(
            '[CheckInScheduler] Ignoring stale active flag for user',
            user._id.toString(),
            'lastActiveAt',
            user.lastActiveAt ? user.lastActiveAt.toISOString() : 'null',
          );
          user.isActive = false;
          await user.save();
        }

        // Enforce hard deadline cap — if the absolute max window has passed, reset the clock
        const nowInner = new Date();
        if (user.checkInHardDeadlineAt && nowInner > user.checkInHardDeadlineAt) {
          console.log(
            '[CheckInScheduler] Hard deadline passed for user',
            user._id.toString(),
          );
          user.checkInStatus = 'ok';
          armCheckInWindowRespectingSleep(user, nowInner);
          await user.save();
          continue;
        }

        const responseDeadline = new Date(nowInner.getTime() + countdownMinutes * 60 * 1000);

        // Atomically claim the user slot to prevent duplicate sessions from concurrent
        // scheduler ticks, respondOk, or activity-reset operations.
        const claimed = await User.findOneAndUpdate(
          {
            _id: user._id,
            checkInStatus: { $ne: 'pending' },
            nextCheckInAt: { $ne: null, $lte: nowInner },
          },
          {
            $set: {
              checkInStatus: 'pending',
              nextCheckInAt: null,
              checkInHardDeadlineAt: null,
            },
          },
          { new: true },
        ).exec();

        if (!claimed) {
          console.log(
            '[CheckInScheduler] User',
            user._id.toString(),
            'already claimed by another process — skipping',
          );
          continue;
        }

        const session = await CheckInSession.create({
          user: user._id,
          status: 'pending',
          responseDeadline,
        });

        console.log(
          '[CheckInScheduler] Started check-in session',
          session._id.toString(),
          'for user',
          user._id.toString(),
          'deadline',
          responseDeadline.toISOString(),
        );

        // Fire a push notification so the device is alerted even if app is closed
        await sendCheckInNotification(user, session);
      } catch (err) {
        console.error('[CheckInScheduler] Error handling user', user._id.toString(), err);
      }
    }
  } catch (err) {
    console.error('[CheckInScheduler] Error in schedulerTick', err);
  }
}

function startCheckInScheduler() {
  const startupDelay = Math.floor(Math.random() * SCHEDULER_INTERVAL_MS);
  console.log(
    '[CheckInScheduler] Starting scheduler with startup delay',
    startupDelay,
    'ms, interval',
    SCHEDULER_INTERVAL_MS,
    'ms',
  );
  setTimeout(() => {
    schedulerTick();
    setInterval(schedulerTick, SCHEDULER_INTERVAL_MS);
  }, startupDelay);
}

module.exports = {
  startCheckInScheduler,
};
