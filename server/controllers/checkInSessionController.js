const CheckInSession = require('../models/CheckInSession');
const User = require('../models/User');
const { initiateEmergencyProtocol } = require('../services/emergencyProtocolService');
const { armCheckInWindowRespectingSleep } = require('../services/checkInWindowService');

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
    let session = await CheckInSession.findOne({
      user: req.userId,
    })
      .sort({ createdAt: -1 })
      .exec();

    if (!session || !['pending', 'emergency'].includes(session.status)) {
      return res.status(200).json({ session: null });
    }

    const now = new Date();

    if (session.status === 'pending' && now > session.responseDeadline) {
      await initiateEmergencyProtocol({
        sessionId: session._id,
        userId: req.userId,
        reason: 'get-active-session-timeout',
      });
    }

    session = await CheckInSession.findById(session._id);

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

    // Schedule the next window and reset hard-deadline cap.
    armCheckInWindowRespectingSleep(user, now);

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

    const result = await initiateEmergencyProtocol({
      sessionId: session._id,
      userId: req.userId,
      reason: 'manual-emergency',
      ignoreDeadline: true,
    });

    const updatedSession = result.session || session;
    const user =
      result.user ||
      (await User.findById(req.userId).select('-password'));

    return res.status(200).json({ session: updatedSession, user });
  } catch (error) {
    console.error('[checkInSessionController.respondEmergency] error', error);
    return res.status(500).json({
      message: 'Error setting emergency status',
      error: error.message,
    });
  }
};
