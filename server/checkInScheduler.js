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

async function schedulerTick() {
  const now = new Date();
  try {
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

        if (user.isActive === true) {
          console.log(
            '[CheckInScheduler] App active - resetting check-in window for user',
            user._id.toString(),
          );
          user.checkInStatus = 'ok';
          armCheckInWindowRespectingSleep(user, now);
          await user.save();
          continue;
        }

        const existingPending = await CheckInSession.findOne({
          user: user._id,
          status: 'pending',
        })
          .sort({ createdAt: -1 })
          .exec();

        if (existingPending) {
          console.log(
            '[CheckInScheduler] User',
            user._id.toString(),
            'already has pending session',
            existingPending._id.toString(),
            'skipping new session',
          );
          continue;
        }

        const nowInner = new Date();
        const responseDeadline = new Date(nowInner.getTime() + countdownMinutes * 60 * 1000);

        const session = await CheckInSession.create({
          user: user._id,
          status: 'pending',
          responseDeadline,
        });

        user.checkInStatus = 'pending';
        user.nextCheckInAt = null; // next will be scheduled when user confirms OK
        user.checkInHardDeadlineAt = null;
        await user.save();

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
  console.log('[CheckInScheduler] Starting scheduler with interval', SCHEDULER_INTERVAL_MS, 'ms');
  setInterval(schedulerTick, SCHEDULER_INTERVAL_MS);
}

module.exports = {
  startCheckInScheduler,
};
