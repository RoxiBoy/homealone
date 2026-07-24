const { getEffectiveDndState } = require('./sleepWindowService');
const { buildSubscriptionAccessPayload } = require('./subscriptionAccessService');

const REFERRAL_REWARD_CENTS_PER_CONVERSION = Number(
  process.env.REFERRAL_REWARD_CENTS_PER_CONVERSION || 1000,
);

function getReferralRewardCents(stats) {
  const explicitCents = Number(stats?.rewardCents || 0);
  if (explicitCents > 0) {
    return explicitCents;
  }

  const legacyMonths = Number(stats?.rewardMonths || 0);
  return legacyMonths > 0 ? legacyMonths * REFERRAL_REWARD_CENTS_PER_CONVERSION : 0;
}

function buildUserResponse(user, now = new Date()) {
  if (!user) {
    return null;
  }

  const raw = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete raw.password;
  delete raw.authTokenVersion;
  delete raw.authSessionExpiresAt;
  delete raw.loggedOutAt;

  const effectiveState = getEffectiveDndState(raw, now);
  const rewardCents = getReferralRewardCents(raw.referralStats);

  return {
    ...raw,
    id: raw.id || (raw._id ? raw._id.toString() : undefined),
    ...buildSubscriptionAccessPayload(raw, now),
    dnd: raw.dnd === true,
    sleepTimerEnabled: raw.sleepTimerEnabled === true,
    sleepStartHour: Number.isInteger(raw.sleepStartHour) ? raw.sleepStartHour : 21,
    sleepEndHour: Number.isInteger(raw.sleepEndHour) ? raw.sleepEndHour : 7,
    sleepTimezone: typeof raw.sleepTimezone === 'string' && raw.sleepTimezone ? raw.sleepTimezone : 'UTC',
    effectiveDnd: effectiveState.effectiveDnd,
    dndReason: effectiveState.dndReason,
    referral: {
      code: raw.referralCode || null,
      referredBy: raw.referredBy ? raw.referredBy.toString() : null,
      stats: {
        signups: Number(raw.referralStats?.signups || 0),
        conversions: Number(raw.referralStats?.conversions || 0),
        rewardCents,
        rewardDollars: rewardCents / 100,
      },
      rewardGrantedAt: raw.referralRewardGrantedAt || null,
    },
  };
}

module.exports = {
  buildUserResponse,
};
