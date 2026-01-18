const User = require('../models/User');
const Friend = require('../models/Friend');

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

// Update check-in settings (interval and countdown)
exports.updateSettings = async (req, res) => {
  try {
    const { checkInIntervalHours, emergencyCountdownMinutes } = req.body;

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

    // If the user is not in an emergency, schedule the next check-in based on the (possibly new) interval
    if (user.checkInStatus !== 'emergency') {
      const intervalHours = user.checkInIntervalHours ?? 2;
      if (intervalHours > 0) {
        const now = new Date();
        user.nextCheckInAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
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
    
    // If status is 'emergency', get priority 1 contact
    if (status === 'emergency') {
      const priorityContact = await Friend.findOne({
        user: req.userId,
        priority: 1
      });
      
      if (priorityContact) {
        // In a real implementation, this would trigger an SMS or call to the contact
        console.log(`EMERGENCY: Contacting ${priorityContact.name} at ${priorityContact.phone}`);
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