const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
const PAID_PLANS = new Set(['monthly', 'yearly']);

function shouldBypassSubscriptionForTesting() {
  if (process.env.REQUIRE_ACTIVE_SUBSCRIPTION === 'true') {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}

function hasActiveSubscription(user, now = new Date()) {
  if (shouldBypassSubscriptionForTesting()) {
    return true;
  }

  const subscription = user?.subscription || {};
  const plan = subscription.plan;
  const status = subscription.stripeSubscriptionStatus;

  if (!PAID_PLANS.has(plan) || !ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
    return false;
  }

  if (subscription.subscriptionEndDate) {
    const endDate = new Date(subscription.subscriptionEndDate);
    if (!Number.isNaN(endDate.getTime()) && endDate <= now) {
      return false;
    }
  }

  return true;
}

function clearCheckInSchedule(user) {
  if (!user) {
    return;
  }

  if (user.checkInStatus !== 'emergency') {
    user.checkInStatus = 'ok';
  }
  user.nextCheckInAt = null;
  user.checkInHardDeadlineAt = null;
}

function buildSubscriptionAccessPayload(user, now = new Date()) {
  return {
    serviceActive: hasActiveSubscription(user, now),
    requiresSubscription: !hasActiveSubscription(user, now),
  };
}

module.exports = {
  ACTIVE_SUBSCRIPTION_STATUSES,
  PAID_PLANS,
  buildSubscriptionAccessPayload,
  clearCheckInSchedule,
  hasActiveSubscription,
  shouldBypassSubscriptionForTesting,
};
