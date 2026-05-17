const User = require('../models/User');

const REFERRAL_CODE_MIN_LENGTH = 4;
const REFERRAL_CODE_MAX_LENGTH = 24;
const REFERRAL_REWARD_MONTHS_PER_CONVERSION = Number(
  process.env.REFERRAL_REWARD_MONTHS_PER_CONVERSION || 1,
);
const REFERRAL_REWARD_CENTS_PER_CONVERSION = Number(
  process.env.REFERRAL_REWARD_CENTS_PER_CONVERSION || 1000,
);

function getRewardCents(stats) {
  const explicitCents = Number(stats?.rewardCents || 0);
  if (explicitCents > 0) {
    return explicitCents;
  }

  const legacyMonths = Number(stats?.rewardMonths || 0);
  return legacyMonths > 0
    ? legacyMonths * REFERRAL_REWARD_CENTS_PER_CONVERSION
    : 0;
}

function sanitizeReferralCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, REFERRAL_CODE_MAX_LENGTH);
}

function buildReferralShareLink(code) {
  const base =
    process.env.REFERRAL_SHARE_BASE_URL ||
    process.env.WEB_APP_URL ||
    'https://homealoneapp.com/register';
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}ref=${encodeURIComponent(code)}`;
}

function buildReferralPayload(user) {
  const code = typeof user?.referralCode === 'string' ? user.referralCode : null;
  const rewardCents = getRewardCents(user?.referralStats);
  return {
    code,
    shareLink: code ? buildReferralShareLink(code) : null,
    referredBy: user?.referredBy ? user.referredBy.toString() : null,
    stats: {
      signups: Number(user?.referralStats?.signups || 0),
      conversions: Number(user?.referralStats?.conversions || 0),
      rewardCents,
      rewardDollars: rewardCents / 100,
      rewardCentsPerConversion: REFERRAL_REWARD_CENTS_PER_CONVERSION,
    },
    rewardGrantedAt: user?.referralRewardGrantedAt || null,
  };
}

async function ensureReferralCode(user) {
  if (!user) {
    return null;
  }
  if (user.referralCode) {
    return user.referralCode;
  }

  await user.validate();
  if (!user.referralCode) {
    throw new Error('Failed to generate referral code');
  }

  await user.save();
  return user.referralCode;
}

async function applyReferralCode({ userId, code }) {
  const normalizedCode = sanitizeReferralCode(code);
  if (normalizedCode.length < REFERRAL_CODE_MIN_LENGTH) {
    const error = new Error('Invalid referral code');
    error.statusCode = 400;
    throw error;
  }

  const [user, referrer] = await Promise.all([
    User.findById(userId).exec(),
    User.findOne({ referralCode: normalizedCode }).exec(),
  ]);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (!referrer) {
    const error = new Error('Referral code not found');
    error.statusCode = 404;
    throw error;
  }

  if (String(referrer._id) === String(user._id)) {
    const error = new Error('You cannot use your own referral code');
    error.statusCode = 400;
    throw error;
  }

  if (user.referredBy) {
    const error = new Error('Referral code already applied to this account');
    error.statusCode = 409;
    throw error;
  }

  const applied = await User.findOneAndUpdate(
    { _id: user._id, referredBy: null },
    { $set: { referredBy: referrer._id } },
    { new: true },
  ).exec();

  if (!applied) {
    const error = new Error('Referral code already applied to this account');
    error.statusCode = 409;
    throw error;
  }

  await User.updateOne(
    { _id: referrer._id },
    { $inc: { 'referralStats.signups': 1 } },
  ).exec();

  if (
    applied.subscription?.stripeSubscriptionStatus === 'active' ||
    applied.subscription?.stripeSubscriptionStatus === 'trialing'
  ) {
    await rewardReferrerForConversion(applied);
  }

  return applied;
}

async function rewardReferrerForConversion(referredUser) {
  if (!referredUser?.referredBy || referredUser.referralRewardGrantedAt) {
    return false;
  }

  const updatedReferredUser = await User.findOneAndUpdate(
    { _id: referredUser._id, referredBy: { $ne: null }, referralRewardGrantedAt: null },
    { $set: { referralRewardGrantedAt: new Date() } },
    { new: true },
  ).exec();

  if (!updatedReferredUser) {
    return false;
  }

  await User.updateOne(
    { _id: updatedReferredUser.referredBy },
    {
      $inc: {
        'referralStats.conversions': 1,
        'referralStats.rewardCents': REFERRAL_REWARD_CENTS_PER_CONVERSION,
      },
    },
  ).exec();

  return true;
}

module.exports = {
  REFERRAL_REWARD_CENTS_PER_CONVERSION,
  REFERRAL_REWARD_MONTHS_PER_CONVERSION,
  applyReferralCode,
  buildReferralPayload,
  buildReferralShareLink,
  ensureReferralCode,
  rewardReferrerForConversion,
  sanitizeReferralCode,
};
