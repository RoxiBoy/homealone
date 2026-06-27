const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CheckInSession = require('../models/CheckInSession');
const {
  armCheckInWindowRespectingSleep,
  getHardDeadlineMs,
} = require('../services/checkInWindowService');
const { buildUserResponse } = require('../services/userResponseService');
const { ensureReferralCode, sanitizeReferralCode } = require('../services/referralService');
const {
  clearCheckInSchedule,
  hasActiveSubscription,
} = require('../services/subscriptionAccessService');

// Register a new user
exports.register = async (req, res) => {
  try {
    const {
      username,
      password,
      name,
      email,
      phone,
      age,
      referralCode: rawReferralCode,
    } = req.body || {};

    const cleanUsername = String(username || '').trim();
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim();
    const numericAge = Number(age);
    const referralCode = sanitizeReferralCode(rawReferralCode);
    const hasReferralInput =
      typeof rawReferralCode === 'string' && rawReferralCode.trim().length > 0;

    if (!cleanUsername || !password || !cleanName || !cleanEmail || !cleanPhone || !Number.isFinite(numericAge) || numericAge <= 0) {
      return res.status(400).json({
        message: 'Missing or invalid registration fields',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Username or email already exists' 
      });
    }

    if (hasReferralInput && !referralCode) {
      return res.status(400).json({
        message: 'Referral code is invalid',
      });
    }

    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode }).select('_id').exec();
      if (!referrer) {
        return res.status(400).json({
          message: 'Referral code is invalid',
        });
      }
    }

    // Create new user
    const user = new User({
      username: cleanUsername,
      password,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      age: numericAge,
      referredBy: referrer ? referrer._id : null,
    });

    await user.save();

    if (referrer) {
      await User.updateOne(
        { _id: referrer._id },
        { $inc: { 'referralStats.signups': 1 } },
      ).exec();
    }

    res.status(201).json({
      message: 'User registered successfully',
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: 'An account with those details already exists',
      });
    }
    res.status(500).json({
      message: 'Error registering user',
      error: error.message,
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Trying loggin in for: ${username}`)

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Ensure the user has a nextCheckInAt scheduled (server-driven timer)
    try {
      await ensureReferralCode(user);

      if (!hasActiveSubscription(user)) {
        clearCheckInSchedule(user);
        await user.save();
      } else if (user.checkInStatus !== 'emergency' && user.dnd !== true) {
        const now = new Date();
        // If nothing scheduled yet or the scheduled time is in the past, schedule a new one.
        if (!user.nextCheckInAt || user.nextCheckInAt <= now) {
          const result = armCheckInWindowRespectingSleep(user, now);
          if (result) {
            await user.save();
            console.log(
              '[authController.login] Scheduled nextCheckInAt for user',
              user._id.toString(),
              'at',
              result.nextCheckInAt.toISOString(),
            );
          }
        } else if (!user.checkInHardDeadlineAt) {
          user.checkInHardDeadlineAt = new Date(user.nextCheckInAt.getTime() + getHardDeadlineMs());
          await user.save();
        }
      }
    } catch (scheduleErr) {
      console.warn('[authController.login] Failed to schedule nextCheckInAt on login', scheduleErr);
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return user info and token
    res.status(200).json({
        token,
        user: buildUserResponse(user),
    });
    } catch (error) {
        res.status(500).json({
        message: 'Error logging in',
        error: error.message,
        });
    }
};

// Logout user — clears server-side session state so the scheduler stops and push tokens are removed.
exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Expire any pending check-in session
    const pendingSession = await CheckInSession.findOne({
      user: user._id,
      status: 'pending',
    })
      .sort({ createdAt: -1 })
      .exec();

    if (pendingSession) {
      pendingSession.status = 'expired';
      pendingSession.resolutionReason = 'user_logout';
      pendingSession.resolvedAt = new Date();
      await pendingSession.save();
    }

    // Clear scheduling and push state so the scheduler won't fire new check-ins
    user.nextCheckInAt = null;
    user.checkInHardDeadlineAt = null;
    user.checkInStatus = 'ok';
    user.isActive = false;
    user.lastActiveAt = null;
    user.fcmToken = null;

    await user.save();

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({
      message: 'Error logging out',
      error: error.message,
    });
  }
};
