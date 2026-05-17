const stripeService = require('../services/stripeService');
const User = require('../models/User');
const { armCheckInWindowRespectingSleep } = require('../services/checkInWindowService');
const {
  buildSubscriptionAccessPayload,
  clearCheckInSchedule,
  hasActiveSubscription,
} = require('../services/subscriptionAccessService');

function buildSubscriptionPayload(user) {
  return {
    plan: user.subscription?.plan || 'free',
    status: user.subscription?.stripeSubscriptionStatus || null,
    startDate: user.subscription?.subscriptionStartDate || null,
    endDate: user.subscription?.subscriptionEndDate || null,
    autoRenew: user.subscription?.autoRenew ?? true,
    ...buildSubscriptionAccessPayload(user),
  };
}

async function loadAuthenticatedUser(req) {
  if (!req.userId) {
    return null;
  }

  return User.findById(req.userId).exec();
}

async function createCheckoutSession(req, res, next) {
  try {
    const { plan } = req.body;
    const user = await loadAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({
        message: 'Invalid plan. Must be "monthly" or "yearly"',
      });
    }

    const session = await stripeService.createCheckoutSession(user, plan);

    if (!user.subscription) {
      user.subscription = {};
    }

    if (!user.subscription.stripeCustomerId && session.customer) {
      user.subscription.stripeCustomerId = String(session.customer);
      await user.save();
    }

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    next(error);
  }
}

async function getSubscriptionStatus(req, res, next) {
  try {
    const user = await loadAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      subscription: buildSubscriptionPayload(user),
    });
  } catch (error) {
    next(error);
  }
}

async function activateTestSubscription(req, res, next) {
  try {
    const { plan = 'monthly' } = req.body || {};
    const user = await loadAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({
        message: 'Invalid plan. Must be "monthly" or "yearly"',
      });
    }

    const now = new Date();
    const endDate = new Date(now);
    if (plan === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    if (!user.subscription) {
      user.subscription = {};
    }

    user.subscription.plan = plan;
    user.subscription.stripeSubscriptionStatus = 'active';
    user.subscription.subscriptionStartDate = now;
    user.subscription.subscriptionEndDate = endDate;
    user.subscription.autoRenew = true;

    // Temporary testing path: grant access without creating a Stripe checkout session.
    if (user.checkInStatus !== 'emergency' && user.dnd !== true) {
      armCheckInWindowRespectingSleep(user, now);
    }

    await user.save();

    res.json({
      message: 'Test subscription activated',
      subscription: buildSubscriptionPayload(user),
    });
  } catch (error) {
    next(error);
  }
}

async function cancelSubscription(req, res, next) {
  try {
    const user = await loadAuthenticatedUser(req);
    const { immediately } = req.body;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        message: 'No active subscription found',
      });
    }

    const updatedSubscription = await stripeService.cancelSubscription(
      user.subscription.stripeSubscriptionId,
      immediately || false,
    );

    user.subscription.stripeSubscriptionStatus = updatedSubscription.status || user.subscription.stripeSubscriptionStatus;
    user.subscription.subscriptionEndDate = updatedSubscription.current_period_end
      ? new Date(updatedSubscription.current_period_end * 1000)
      : user.subscription.subscriptionEndDate;
    user.subscription.autoRenew =
      typeof updatedSubscription.cancel_at_period_end === 'boolean'
        ? !updatedSubscription.cancel_at_period_end
        : false;

    if (immediately) {
      user.subscription.plan = 'free';
    }

    if (!hasActiveSubscription(user)) {
      clearCheckInSchedule(user);
    }

    await user.save();

    res.json({
      message: 'Subscription canceled successfully',
      subscription: buildSubscriptionPayload(user),
    });
  } catch (error) {
    next(error);
  }
}

async function reactivateSubscription(req, res, next) {
  try {
    const user = await loadAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        message: 'No subscription found',
      });
    }

    const updatedSubscription = await stripeService.reactivateSubscription(
      user.subscription.stripeSubscriptionId,
    );

    user.subscription.stripeSubscriptionStatus =
      updatedSubscription.status || user.subscription.stripeSubscriptionStatus;
    user.subscription.subscriptionEndDate = updatedSubscription.current_period_end
      ? new Date(updatedSubscription.current_period_end * 1000)
      : user.subscription.subscriptionEndDate;
    user.subscription.autoRenew =
      typeof updatedSubscription.cancel_at_period_end === 'boolean'
        ? !updatedSubscription.cancel_at_period_end
        : true;

    await user.save();

    res.json({
      message: 'Subscription reactivated successfully',
      subscription: buildSubscriptionPayload(user),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  activateTestSubscription,
  createCheckoutSession,
  getSubscriptionStatus,
  cancelSubscription,
  reactivateSubscription,
};
