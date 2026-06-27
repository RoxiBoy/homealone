const CheckInSession = require('../models/CheckInSession');
const User = require('../models/User');
const { initiateEmergencyProtocol } = require('../services/emergencyProtocolService');
const { armCheckInWindowRespectingSleep } = require('../services/checkInWindowService');
const {
  clearCheckInSchedule,
  hasActiveSubscription,
} = require('../services/subscriptionAccessService');

// Grace period (ms) added beyond responseDeadline before escalating to emergency.
// Gives offline users or late responders a brief window to still submit "I'm OK"
// before contacts are notified.
const GRACE_PERIOD_MS = 30_000;

exports.startSession = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!hasActiveSubscription(user)) {
      clearCheckInSchedule(user);
      await user.save();
      return res.status(402).json({
        message: 'An active subscription is required for HomeAlone monitoring.',
      });
    }

    // Reject if a pending session already exists (prevents duplicates)
    const existing = await CheckInSession.findOne({
      user: req.userId,
      status: 'pending',
    }).exec();

    if (existing) {
      return res.status(409).json({ message: 'A check-in is already in progress' });
    }

    const countdownMinutes = user.emergencyCountdownMinutes ?? 2;
    const now = new Date();
    const responseDeadline = new Date(now.getTime() + countdownMinutes * 60 * 1000);

    // Atomically claim the user slot to prevent the scheduler from creating a session
    // between our pending check and session creation.
    const claimed = await User.findOneAndUpdate(
      {
        _id: req.userId,
        checkInStatus: { $ne: 'pending' },
      },
      { $set: { checkInStatus: 'pending' } },
      { new: true },
    ).exec();

    if (!claimed) {
      return res.status(409).json({ message: 'A check-in is already being initialized' });
    }

    const session = await CheckInSession.create({
      user: user._id,
      status: 'pending',
      responseDeadline,
    });

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
    const user = await User.findById(req.userId).exec();

    if (user && !hasActiveSubscription(user, now)) {
      session.status = 'expired';
      session.resolutionReason = 'suppressed';
      session.resolvedAt = now;
      await session.save();
      clearCheckInSchedule(user);
      await user.save();
      return res.status(200).json({ session: null });
    }

    if (session.status === 'pending' && now.getTime() >= session.responseDeadline.getTime() + GRACE_PERIOD_MS) {
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

    // Guard: only pending sessions can be acknowledged
    if (session.status !== 'pending') {
      return res.status(409).json({
        message: 'Session is not in a pending state',
        currentStatus: session.status,
      });
    }

    const now = new Date();
    session.status = 'ok';
    session.resolutionReason = 'ok';
    session.resolvedAt = now;
    await session.save();

    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.lastCheckIn = now;
    user.checkInStatus = 'ok';
    user.isActive = true;

    if (hasActiveSubscription(user, now)) {
      // Schedule the next window and reset hard-deadline cap.
      armCheckInWindowRespectingSleep(user, now);
    } else {
      clearCheckInSchedule(user);
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
