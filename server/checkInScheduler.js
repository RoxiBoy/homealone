const User = require('./models/User');
const CheckInSession = require('./models/CheckInSession');
const { sendCheckInNotification } = require('./services/pushService');

const SCHEDULER_INTERVAL_MS = 5000; // run every 60 seconds

async function schedulerTick() {
  const now = new Date();
  try {
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

        if (!intervalHours || intervalHours <= 0) {
          console.log('[CheckInScheduler] Skipping user', user._id.toString(), 'invalid interval', intervalHours);
          continue;
        }

        // 1) DND: disable check-in alerts entirely
        if (user.dnd === true) {
          console.log('[CheckInScheduler] DND enabled - skipping check-in for user', user._id.toString());
          user.checkInStatus = 'ok';
          user.nextCheckInAt = null;
          user.checkInHardDeadlineAt = null;
          await user.save();
          continue;
        }

        // Avoid creating duplicate pending sessions, but expire stale ones so a fresh
        // session can be created when the user arms settings again.
        const existingPending = await CheckInSession.findOne({
          user: user._id,
          status: 'pending',
        })
          .sort({ createdAt: -1 })
          .exec();

        if (existingPending) {
          const nowInner = new Date();
          if (existingPending.responseDeadline <= nowInner) {
            console.log(
              '[CheckInScheduler] Expiring stale pending session',
              existingPending._id.toString(),
              'for user',
              user._id.toString(),
            );
            existingPending.status = 'expired';
            existingPending.resolvedAt = nowInner;
            await existingPending.save();
            // Reset user status so a new check-in can be scheduled.
            user.checkInStatus = 'ok';
          } else {
            console.log(
              '[CheckInScheduler] User',
              user._id.toString(),
              'already has non-expired pending session',
              existingPending._id.toString(),
              'skipping new session',
            );
            continue;
          }
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
