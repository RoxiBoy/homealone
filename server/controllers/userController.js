const User = require('../models/User');
const Friend = require('../models/Friend');
const { sendTestNotification } = require('../services/pushService');
const CheckInSession = require('../models/CheckInSession');

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
        const intervalHours = user.checkInIntervalHours ?? 2;
        if (intervalHours > 0) {
          user.nextCheckInAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
        }
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

// Update user activity state (foreground/background).
// This is used by the scheduler to suppress check-in pushes while the user is actively using the app.
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

    // IMPORTANT: Do NOT auto-clear pending sessions here.
    // If the user tapped a check-in notification, we want the client to be able to fetch
    // the active session and show the "Are you okay?" modal.

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

    if (user.dnd === true || user.isActive === true) {
      return res.status(200).json({ message: 'Notifications are currently silenced (DND or active)' });
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
