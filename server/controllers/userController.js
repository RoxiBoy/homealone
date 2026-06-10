const User = require('../models/User');
const Friend = require('../models/Friend');
const { sendTestNotification } = require('../services/pushService');
const CheckInSession = require('../models/CheckInSession');
const {
  armCheckInWindowRespectingSleep,
  getIntervalMs,
  getHardDeadlineMs,
} = require('../services/checkInWindowService');
const { getEffectiveDndState, resolveTimezone } = require('../services/sleepWindowService');
const { buildUserResponse } = require('../services/userResponseService');
const { getUserDashboardStats } = require('../services/statsService');
const {
  applyReferralCode: applyReferralCodeService,
  buildReferralPayload,
  ensureReferralCode,
} = require('../services/referralService');
const {
  clearCheckInSchedule,
  hasActiveSubscription,
} = require('../services/subscriptionAccessService');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await ensureReferralCode(user);
    
    res.status(200).json(buildUserResponse(user));
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching user profile',
      error: error.message,
    });
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).exec();
    if (user) {
      await ensureReferralCode(user);
    }

    const dashboard = await getUserDashboardStats(req.userId);

    if (!dashboard) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(dashboard);
  } catch (error) {
    return next(error);
  }
};

exports.getReferralStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId).exec();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await ensureReferralCode(user);

    return res.status(200).json({
      referral: buildReferralPayload(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error fetching referral status',
      error: error.message,
    });
  }
};

exports.applyReferralCode = async (req, res) => {
  try {
    const code = req.body?.code;
    const user = await applyReferralCodeService({
      userId: req.userId,
      code,
    });

    return res.status(200).json({
      message: 'Referral code applied successfully',
      referral: buildReferralPayload(user),
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    return res.status(statusCode).json({
      message: error.message || 'Error applying referral code',
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, age } = req.body;
    
    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { name, email, phone, age },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(buildUserResponse(updatedUser));
  } catch (error) {
    res.status(500).json({
      message: 'Error updating user profile',
      error: error.message,
    });
  }
};

// Register or update the user's device FCM token
exports.updateDeviceToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.fcmToken = fcmToken || null;
    await user.save();

    return res.status(200).json({ message: 'Device token updated' });
  } catch (error) {
    return res.status(500).json({
      message: 'Error updating device token',
      error: error.message,
    });
  }
};

// Update last check-in time
exports.updateCheckIn = async (req, res) => {
  try {
    const { timestamp } = req.body;
    const lastCheckIn = timestamp ? new Date(timestamp) : new Date();
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { 
        lastCheckIn,
        checkInStatus: 'ok' 
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      message: 'Check-in updated successfully',
      lastCheckIn: user.lastCheckIn,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating check-in',
      error: error.message,
    });
  }
};

async function resolveLatestPendingSession(userId) {
  return CheckInSession.findOne({
    user: userId,
    status: 'pending',
  })
    .sort({ createdAt: -1 })
    .exec();
}

async function cancelPendingSession(userId, now, reason) {
  const pending = await resolveLatestPendingSession(userId);
  if (!pending) {
    return null;
  }

  pending.status = 'expired';
  pending.resolutionReason = reason === 'suppressed' ? 'suppressed' : 'sleep_window';
  pending.resolvedAt = now;
  await pending.save();
  return pending;
}

// Update check-in settings (interval, countdown, DND, sleep timer)
exports.updateSettings = async (req, res) => {
  try {
    const {
      checkInIntervalHours,
      emergencyCountdownMinutes,
      dnd,
      sleepTimerEnabled,
      sleepStartHour,
      sleepEndHour,
      sleepTimezone,
    } = req.body;

    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof checkInIntervalHours === 'number') {
      user.checkInIntervalHours = checkInIntervalHours;
    }
    if (typeof emergencyCountdownMinutes === 'number') {
      user.emergencyCountdownMinutes = emergencyCountdownMinutes;
    }
    if (typeof dnd === 'boolean') {
      user.dnd = dnd;
    }
    if (typeof sleepTimerEnabled === 'boolean') {
      user.sleepTimerEnabled = sleepTimerEnabled;
    }
    if (Number.isInteger(sleepStartHour) && sleepStartHour >= 0 && sleepStartHour <= 23) {
      user.sleepStartHour = sleepStartHour;
    }
    if (Number.isInteger(sleepEndHour) && sleepEndHour >= 0 && sleepEndHour <= 23) {
      user.sleepEndHour = sleepEndHour;
    }
    if (typeof sleepTimezone === 'string') {
      user.sleepTimezone = resolveTimezone(sleepTimezone);
    }

    // If the user is not in an emergency, schedule (or disable) the next check-in.
    if (!hasActiveSubscription(user)) {
      user.checkInStatus = 'ok';
      await cancelPendingSession(req.userId, new Date(), 'suppressed');
      clearCheckInSchedule(user);
    } else if (user.checkInStatus !== 'emergency') {
      const now = new Date();
      const effectiveState = getEffectiveDndState(user, now);

      if (effectiveState.effectiveDnd === true) {
        // DND means: no check-in sessions / pushes should be produced.
        user.checkInStatus = 'ok';
        await cancelPendingSession(req.userId, now, effectiveState.dndReason || 'suppressed');

        if (effectiveState.dndReason === 'manual') {
          user.nextCheckInAt = null;
          user.checkInHardDeadlineAt = null;
        } else {
          armCheckInWindowRespectingSleep(user, now);
        }
      } else {
        armCheckInWindowRespectingSleep(user, now);
      }
    }

    await user.save();

    res.status(200).json(buildUserResponse(user));
  } catch (error) {
    res.status(500).json({
      message: 'Error updating settings',
      error: error.message,
    });
  }
};

// Legacy activity state endpoint (still available for clients).
exports.updateActivity = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    user.isActive = isActive;
    user.lastActiveAt = now;

    await user.save();

    return res.status(200).json({
      ok: true,
      dnd: user.dnd,
      effectiveDnd: getEffectiveDndState(user, now).effectiveDnd,
      dndReason: getEffectiveDndState(user, now).dndReason,
      isActive: user.isActive,
      lastActiveAt: user.lastActiveAt,
      nextCheckInAt: user.nextCheckInAt,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error updating activity state',
      error: error.message,
    });
  }
};

// Reset/snooze the active check-in window when recent device usage is detected.
// Backend remains source-of-truth and enforces a hard deadline cap.
exports.resetCheckInWindow = async (req, res) => {
  const requestId =
    typeof req.body?.requestId === 'string' && req.body.requestId
      ? req.body.requestId
      : `srv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const logPrefix = `[userController.resetCheckInWindow][${requestId}]`;

  try {
    const { lastTimeUsed, thresholdMs, packageName, forceActive, source } = req.body || {};
    const now = new Date();
    console.log(
      `${logPrefix} start userId=${req.userId} source=${source || 'unknown'} packageName=${
        packageName || 'unknown'
      } forceActive=${Boolean(forceActive)} now=${now.toISOString()} lastTimeUsed=${
        typeof lastTimeUsed === 'number' ? new Date(lastTimeUsed).toISOString() : 'n/a'
      } thresholdMs=${typeof thresholdMs === 'number' ? thresholdMs : 'n/a'}`,
    );

    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      console.log(`${logPrefix} abort reason=user-not-found`);
      return res.status(404).json({ message: 'User not found', requestId });
    }

    const effectiveState = getEffectiveDndState(user, now);

    console.log(
      `${logPrefix} userState checkInStatus=${user.checkInStatus} dnd=${user.dnd} effectiveDnd=${effectiveState.effectiveDnd} dndReason=${effectiveState.dndReason || 'none'} nextCheckInAt=${
        user.nextCheckInAt ? user.nextCheckInAt.toISOString() : 'null'
      } hardDeadlineAt=${user.checkInHardDeadlineAt ? user.checkInHardDeadlineAt.toISOString() : 'null'}`,
    );

    if (effectiveState.effectiveDnd === true) {
      console.log(`${logPrefix} ignore reason=${effectiveState.dndReason || 'dnd-enabled'}`);
      return res
        .status(200)
        .json({ ok: false, ignored: true, reason: effectiveState.dndReason || 'dnd-enabled', requestId });
    }

    if (!hasActiveSubscription(user, now)) {
      clearCheckInSchedule(user);
      await user.save();
      console.log(`${logPrefix} ignore reason=subscription-required`);
      return res.status(200).json({
        ok: false,
        ignored: true,
        reason: 'subscription-required',
        requestId,
      });
    }

    if (user.checkInStatus === 'emergency') {
      console.log(`${logPrefix} ignore reason=user-in-emergency`);
      return res
        .status(200)
        .json({ ok: false, ignored: true, reason: 'user-in-emergency', requestId });
    }

    const intervalMs = getIntervalMs(user.checkInIntervalHours);
    if (!intervalMs) {
      console.log(
        `${logPrefix} abort reason=invalid-checkin-interval checkInIntervalHours=${user.checkInIntervalHours}`,
      );
      return res.status(400).json({ message: 'Invalid check-in interval', requestId });
    }
    console.log(
      `${logPrefix} interval computed intervalMs=${intervalMs} checkInIntervalHours=${user.checkInIntervalHours}`,
    );

    // Optional guardrail from client-reported usage snapshot.
    if (typeof lastTimeUsed === 'number' && typeof thresholdMs === 'number') {
      const ageMs = now.getTime() - lastTimeUsed;
      console.log(`${logPrefix} usage recency ageMs=${ageMs} thresholdMs=${thresholdMs}`);
      if (ageMs > thresholdMs) {
        console.log(`${logPrefix} ignore reason=usage-not-recent`);
        return res
          .status(200)
          .json({ ok: false, ignored: true, reason: 'usage-not-recent', requestId });
      }
    }

    if (typeof lastTimeUsed === 'number' && user.lastUsageResetAt) {
      const lastResetMs = user.lastUsageResetAt.getTime();
      if (lastTimeUsed <= lastResetMs) {
        console.log(
          `${logPrefix} ignore reason=usage-not-new lastTimeUsed=${new Date(lastTimeUsed).toISOString()} lastUsageResetAt=${user.lastUsageResetAt.toISOString()}`,
        );
        return res
          .status(200)
          .json({ ok: false, ignored: true, reason: 'usage-not-new', requestId });
      }
    }

    const pending = await CheckInSession.findOne({
      user: req.userId,
      status: 'pending',
    })
      .sort({ createdAt: -1 })
      .exec();

    const previousNextCheckInAt = user.nextCheckInAt ? new Date(user.nextCheckInAt) : null;
    const proposedNextCheckInAt = new Date(now.getTime() + intervalMs);

    if (pending) {
      pending.status = 'ok';
      pending.resolutionReason = 'ok';
      pending.resolvedAt = now;
      await pending.save();
      user.checkInStatus = 'ok';
      user.lastCheckIn = now;
      console.log(
        `${logPrefix} resolved pending session from activity sessionId=${pending._id.toString()} responseDeadline=${pending.responseDeadline.toISOString()}`,
      );
    }

    user.nextCheckInAt = proposedNextCheckInAt;
    user.checkInHardDeadlineAt = new Date(proposedNextCheckInAt.getTime() + getHardDeadlineMs());
    if (typeof lastTimeUsed === 'number') {
      user.lastUsageResetAt = new Date(lastTimeUsed);
    }
    await user.save();
    console.log(
      `${logPrefix} success nextCheckInAtUpdated from=${
        previousNextCheckInAt ? previousNextCheckInAt.toISOString() : 'null'
      } to=${user.nextCheckInAt.toISOString()} hardDeadlineAt=${
        user.checkInHardDeadlineAt ? user.checkInHardDeadlineAt.toISOString() : 'null'
      }`,
    );

    return res.status(200).json({
      ok: true,
      nextCheckInAt: user.nextCheckInAt,
      hardDeadlineAt: user.checkInHardDeadlineAt,
      requestId,
    });
  } catch (error) {
    console.error(`${logPrefix} error`, error);
    return res.status(500).json({
      message: 'Error resetting check-in window',
      error: error.message,
      requestId,
    });
  }
};

// Update check-in status
exports.updateCheckInStatus = async (req, res) => {
  try {
    const { status, lastCheckIn } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { 
        checkInStatus: status,
        ...(lastCheckIn && { lastCheckIn: new Date(lastCheckIn) })
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (status === 'emergency') {
      // If status is 'emergency', get priority 1 contact
      const priorityContact = await Friend.findOne({
        user: req.userId,
        priority: 1,
      });
      
      if (priorityContact) {
        // In a real implementation, this would trigger an SMS or call to the contact
        console.log(`EMERGENCY: Contacting ${priorityContact.name} at ${priorityContact.phone}`);
      }
    } else if (status === 'ok') {
      // Clearing emergency: expire the latest emergency check-in session, if any.
      const latestEmergency = await CheckInSession.findOne({
        user: req.userId,
        status: 'emergency',
      })
        .sort({ createdAt: -1 })
        .exec();

      if (latestEmergency) {
        latestEmergency.status = 'expired';
        latestEmergency.resolvedAt = new Date();
        await latestEmergency.save();
        console.log(
          '[userController.updateCheckInStatus] Cleared emergency session',
          latestEmergency._id.toString(),
          'for user',
          user._id.toString(),
        );
      }

      if (hasActiveSubscription(user)) {
        armCheckInWindowRespectingSleep(user, new Date());
      } else {
        clearCheckInSchedule(user);
      }
      await user.save();
    }
    
    res.status(200).json({
      message: 'Check-in status updated successfully',
      status: user.checkInStatus,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating check-in status',
      error: error.message,
    });
  }
};

// Send a simple test FCM notification to the current user
exports.sendTestNotification = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const effectiveState = getEffectiveDndState(user);

    if (!hasActiveSubscription(user)) {
      return res.status(402).json({
        message: 'An active subscription is required to send HomeAlone notifications.',
      });
    }

    if (effectiveState.effectiveDnd === true) {
      const reason =
        effectiveState.dndReason === 'sleep'
          ? 'Notifications are currently silenced by the sleep timer'
          : 'Notifications are currently silenced (DND enabled)';
      return res.status(200).json({ message: reason });
    }

    const result = await sendTestNotification(user);

    if (!result?.ok) {
      const status = result?.status || 500;
      return res.status(status).json({
        message: 'Failed to send test notification',
        reason: result?.reason,
        ...(result?.body ? { fcmResponse: result.body } : {}),
        ...(result?.error ? { error: result.error } : {}),
      });
    }

    return res.status(200).json({ message: 'Test notification request accepted' });
  } catch (error) {
    return res.status(500).json({
      message: 'Error sending test notification',
      error: error.message,
    });
  }
};
