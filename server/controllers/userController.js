const User = require('../models/User');
const Friend = require('../models/Friend');
const { sendTestNotification } = require('../services/pushService');
const CheckInSession = require('../models/CheckInSession');
const { armCheckInWindow, getIntervalMs, getHardDeadlineMs } = require('../services/checkInWindowService');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching user profile',
      error: error.message,
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
    
    res.status(200).json(updatedUser);
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

// Update check-in settings (interval, countdown, DND)
exports.updateSettings = async (req, res) => {
  try {
    const { checkInIntervalHours, emergencyCountdownMinutes, dnd } = req.body;

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

    // If the user is not in an emergency, schedule (or disable) the next check-in.
    if (user.checkInStatus !== 'emergency') {
      const now = new Date();

      if (user.dnd === true) {
        // DND means: no check-in sessions / pushes should be produced.
        user.checkInStatus = 'ok';
        user.nextCheckInAt = null;
        user.checkInHardDeadlineAt = null;

        // If there is an active pending session, mark it OK so it doesn't escalate.
        const pending = await CheckInSession.findOne({
          user: req.userId,
          status: 'pending',
        })
          .sort({ createdAt: -1 })
          .exec();

        if (pending) {
          pending.status = 'ok';
          pending.resolvedAt = now;
          await pending.save();
        }
      } else {
        armCheckInWindow(user, now);
      }
    }

    await user.save();

    res.status(200).json(user);
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

    console.log(
      `${logPrefix} userState checkInStatus=${user.checkInStatus} dnd=${user.dnd} nextCheckInAt=${
        user.nextCheckInAt ? user.nextCheckInAt.toISOString() : 'null'
      } hardDeadlineAt=${user.checkInHardDeadlineAt ? user.checkInHardDeadlineAt.toISOString() : 'null'}`,
    );

    if (user.dnd === true) {
      console.log(`${logPrefix} ignore reason=dnd-enabled`);
      return res
        .status(200)
        .json({ ok: false, ignored: true, reason: 'dnd-enabled', requestId });
    }

    if (user.checkInStatus === 'emergency') {
      console.log(`${logPrefix} ignore reason=user-in-emergency`);
      return res
        .status(200)
        .json({ ok: false, ignored: true, reason: 'user-in-emergency', requestId });
    }

    const pending = await CheckInSession.findOne({
      user: req.userId,
      status: 'pending',
    })
      .sort({ createdAt: -1 })
      .exec();

    if (pending) {
      console.log(
        `${logPrefix} ignore reason=pending-session-active sessionId=${pending._id.toString()} responseDeadline=${pending.responseDeadline.toISOString()}`,
      );
      return res
        .status(200)
        .json({ ok: false, ignored: true, reason: 'pending-session-active', requestId });
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

    const previousNextCheckInAt = user.nextCheckInAt ? new Date(user.nextCheckInAt) : null;
    const proposedNextCheckInAt = new Date(now.getTime() + intervalMs);
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

    if (user.dnd === true) {
      return res.status(200).json({ message: 'Notifications are currently silenced (DND enabled)' });
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
