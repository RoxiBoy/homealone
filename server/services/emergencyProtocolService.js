const CheckInSession = require('../models/CheckInSession');
const User = require('../models/User');
const Friend = require('../models/Friend');
const EmergencyAlert = require('../models/EmergencyAlert');
const { sendSms } = require('./smsService');
const { placeEmergencyCall } = require('./voiceCallService');
const { sendEmail } = require('./brevoEmailService');
const {
  clearCheckInSchedule,
  hasActiveSubscription,
} = require('./subscriptionAccessService');
async function initiateEmergencyProtocol({
  sessionId,
  userId,
  reason = 'unknown',
  ignoreDeadline = false,
}) {
  const logPrefix = `[emergencyProtocolService][${reason}][session=${sessionId}]`;
  const now = new Date();
  const transitionQuery = {
    _id: sessionId,
    user: userId,
    status: 'pending',
  };

  if (!ignoreDeadline) {
    transitionQuery.responseDeadline = { $lte: now };
  }

  const session = await CheckInSession.findOneAndUpdate(
    transitionQuery,
    {
      $set: {
        status: 'emergency',
        resolutionReason: ignoreDeadline ? 'manual_emergency' : 'timeout_emergency',
        resolvedAt: now,
      },
    },
    {
      new: true,
    },
  ).exec();

  if (!session) {
    const existingSession = await CheckInSession.findOne({
      _id: sessionId,
      user: userId,
    }).exec();

    if (existingSession) {
      console.log(
        `${logPrefix} no-op currentStatus=${existingSession.status} responseDeadline=${existingSession.responseDeadline?.toISOString?.() || 'n/a'}`,
      );
      return {
        ok: false,
        escalated: false,
        session: existingSession,
        reason: 'not-transitioned',
      };
    }

    console.log(`${logPrefix} no-op reason=session-not-found`);
    return {
      ok: false,
      escalated: false,
      session: null,
      reason: 'session-not-found',
    };
  }

  let user = await User.findById(userId).exec();

  if (!user) {
    console.log(`${logPrefix} escalated but user not found`);
    session.status = 'expired';
    session.resolutionReason = 'suppressed';
    session.resolvedAt = now;
    await session.save();
    return {
      ok: false,
      escalated: true,
      session,
      reason: 'user-not-found',
    };
  }

  if (!hasActiveSubscription(user, now)) {
    session.status = 'expired';
    session.resolutionReason = 'suppressed';
    session.resolvedAt = now;
    await session.save();

    clearCheckInSchedule(user);
    await user.save();

    console.log(`${logPrefix} stopped before notifications reason=subscription-inactive`);
    return {
      ok: true,
      escalated: false,
      session,
      user,
      reason: 'subscription-inactive',
    };
  }

  const priorityFriend = await Friend.findOne({
    user: userId,
    priority: 1,
  }).exec();

  if (!priorityFriend) {
    console.log(`${logPrefix} escalated but no priority-1 friend configured — expiring session`);
    session.status = 'expired';
    session.resolutionReason = 'suppressed';
    session.resolvedAt = now;
    await session.save();
    return {
      ok: true,
      escalated: false,
      session,
      user,
      reason: 'no-priority-friend',
    };
  }

  user.checkInStatus = 'emergency';
  await user.save();

  const userName = user.name || user.username || 'HomeAlone user';
  const fullPhoneNumber = `${priorityFriend.countryCode || ''}${priorityFriend.phone}`;

  console.log(
    `${logPrefix} sending notifications to ${priorityFriend.name} phone=${fullPhoneNumber} email=${priorityFriend.email || 'n/a'}`,
  );

  console.log('[emergencyProtocolService] Sms and Calling and Email point reached');
  const smsResult = 'Disabled Sms, Point Reached';
  const callResult = 'Disabled Calling, Point Reached';
  let emailResult = 'Disabled Emails, Point Reached';
  // const smsResult = await sendSms(userName, fullPhoneNumber);
  // const callResult = await placeEmergencyCall(userName, fullPhoneNumber, priorityFriend.name);
  // let emailResult = { ok: false, reason: 'missing-email' };

  if (priorityFriend.email) {
    emailResult = await sendEmail(userName, priorityFriend.name, priorityFriend.email);
  } else {
    console.log(`${logPrefix} skipping email because contact has no email`);
  }

  const channels = ['sms', 'voice'];
  if (priorityFriend.email) {
    channels.push('email');
  }

  const notificationStatus =
    [smsResult, callResult, emailResult].some(result => {
      if (!result || typeof result !== 'object') {
        return true;
      }

      return result.ok !== false;
    })
      ? 'sent'
      : 'failed';

  await EmergencyAlert.create({
    user: user._id,
    session: session._id,
    contact: priorityFriend._id,
    channels,
    status: notificationStatus,
    failureReason: notificationStatus === 'failed' ? 'all-channels-failed' : null,
    channelResults: {
      sms: smsResult,
      voice: callResult,
      email: emailResult,
    },
  });

  return {
    ok: true,
    escalated: true,
    session,
    user,
    notifications: {
      sms: smsResult,
      call: callResult,
      email: emailResult,
    },
  };
}

module.exports = {
  initiateEmergencyProtocol,
};
