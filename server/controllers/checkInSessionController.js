const CheckInSession = require('../models/CheckInSession');
const User = require('../models/User');

// Start a new check-in session for the authenticated user.
// In a real system this would be called by a scheduler when the interval elapses.
exports.startSession = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const intervalHours = user.checkInIntervalHours ?? 2;
    const countdownMinutes = user.emergencyCountdownMinutes ?? 2;

    const now = new Date();
    const responseDeadline = new Date(now.getTime() + countdownMinutes * 60 * 1000);

    const session = await CheckInSession.create({
      user: user._id,
      status: 'pending',
      responseDeadline,
    });

    // Mark user as pending on this check-in
    user.checkInStatus = 'pending';
    await user.save();

    return res.status(201).json({
      session,
      countdownSeconds: Math.round((responseDeadline.getTime() - now.getTime()) / 1000),
    });
  } catch (error) {
    console.error('[checkInSessionController.startSession] error', error);
    return res.status(500).json({
      message: 'Error starting check-in session',
      error: error.message,
    });
  }
};

// Get the latest active check-in session (pending or fresh emergency) for the user.
exports.getActiveSession = async (req, res) => {
  try {
    const EMERGENCY_ACTIVE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

    let session = await CheckInSession.findOne({
      user: req.userId,
    })
      .sort({ createdAt: -1 })
      .exec();

    if (!session) {
      return res.status(200).json({ session: null });
    }

    const now = new Date();

    // If the most recent session is pending but past the deadline, escalate to emergency
    if (session.status === 'pending' && now > session.responseDeadline) {
      session.status = 'emergency';
      session.resolvedAt = now;
      await session.save();

      await User.findByIdAndUpdate(req.userId, {
        checkInStatus: 'emergency',
      });
    }

    // Re-fetch to ensure latest values
    session = await CheckInSession.findById(session._id);

    // If the session is emergency but old, mark it as expired and hide from the client
    if (session.status === 'emergency') {
      const resolvedAt = session.resolvedAt || session.updatedAt || session.createdAt;
      if (resolvedAt && now.getTime() - resolvedAt.getTime() > EMERGENCY_ACTIVE_WINDOW_MS) {
        session.status = 'expired';
        await session.save();

        await User.findByIdAndUpdate(req.userId, {
          // Clear emergency flag after window has passed
          checkInStatus: 'ok',
        });

        return res.status(200).json({ session: null });
      }
    }

    return res.status(200).json({ session });
  } catch (error) {
    console.error('[checkInSessionController.getActiveSession] error', error);
    return res.status(500).json({
      message: 'Error fetching active check-in session',
      error: error.message,
    });
  }
};

// User confirms they are OK.
exports.respondOk = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await CheckInSession.findOne({ _id: id, user: req.userId });
    if (!session) {
      return res.status(404).json({ message: 'Check-in session not found' });
    }

    const now = new Date();
    session.status = 'ok';
    session.resolvedAt = now;
    await session.save();

    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.lastCheckIn = now;
    user.checkInStatus = 'ok';

    // Schedule the next check-in based on the user's interval
    const intervalHours = user.checkInIntervalHours ?? 2;
    if (intervalHours > 0) {
      user.nextCheckInAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    }

    await user.save();

    return res.status(200).json({ session, user });
  } catch (error) {
    console.error('[checkInSessionController.respondOk] error', error);
    return res.status(500).json({
      message: 'Error responding to check-in',
      error: error.message,
    });
  }
};

// User indicates they are NOT OK, or app decides emergency after timeout.
exports.respondEmergency = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await CheckInSession.findOne({ _id: id, user: req.userId });
    if (!session) {
      return res.status(404).json({ message: 'Check-in session not found' });
    }

    const now = new Date();
    session.status = 'emergency';
    session.resolvedAt = now;
    await session.save();

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        checkInStatus: 'emergency',
      },
      { new: true },
    ).select('-password');

    return res.status(200).json({ session, user });
  } catch (error) {
    console.error('[checkInSessionController.respondEmergency] error', error);
    return res.status(500).json({
      message: 'Error setting emergency status',
      error: error.message,
    });
  }
};
