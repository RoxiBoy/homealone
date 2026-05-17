const stripeService = require('../services/stripeService');
const User = require('../models/User');
const SubscriptionHistory = require('../models/Subscription');
const { rewardReferrerForConversion } = require('../services/referralService');
const { armCheckInWindowRespectingSleep } = require('../services/checkInWindowService');
const { getEffectiveDndState } = require('../services/sleepWindowService');
const {
  clearCheckInSchedule,
  hasActiveSubscription,
} = require('../services/subscriptionAccessService');

function isConversionStatus(status) {
  return status === 'active' || status === 'trialing';
}

async function handleWebhook(req, res, next) {
  console.log('[webhook] NEW WEBHOOK EVENT RECEIVED');
  console.log('[webhook] Event type:', req.headers['stripe-signature'] ? 'signed' : 'unsigned');
  
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = await stripeService.constructWebhookEvent(req.body, sig);
    console.log('[webhook] Event constructed successfully:', event.type);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log('[webhook] Processing event type:', event.type);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('[webhook] Handling checkout.session.completed');
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        console.log('[webhook] Handling subscription update');
        const subscription = event.data.object;
        await handleSubscriptionUpsert(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        console.log('[webhook] Handling subscription deleted');
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        console.log('[webhook] Handling invoice paid');
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        console.log('[webhook] Handling payment failed');
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }

    console.log('[webhook] Event processing complete, sending 200');
    res.json({ received: true });
  } catch (error) {
    console.error('[webhook] Error processing webhook:', error);
    next(error);
  }
}

function buildHistoryPayload(stripeSubscriptionId, plan, stripeSubscription) {
  const startDate = stripeSubscription.current_period_start && !isNaN(stripeSubscription.current_period_start)
    ? new Date(stripeSubscription.current_period_start * 1000)
    : new Date();
  const endDate = stripeSubscription.current_period_end && !isNaN(stripeSubscription.current_period_end)
    ? new Date(stripeSubscription.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return {
    stripeSubscriptionId,
    plan,
    amount: plan === 'monthly' ? 1000 : 10000,
    currency: 'usd',
    status: stripeSubscription.status,
    startDate: startDate,
    endDate: endDate,
    paymentMethod: 'card',
  };
}

async function persistSubscriptionState(user, stripeSubscription, customerId, planHint) {
  console.log('[webhook] persistSubscriptionState - START');
  console.log('[webhook] User ID:', user._id);
  console.log('[webhook] Plan hint:', planHint);
  console.log('[webhook] Stripe subscription:', JSON.stringify({
    id: stripeSubscription.id,
    status: stripeSubscription.status,
    customer: stripeSubscription.customer,
    current_period_start: stripeSubscription.current_period_start,
    current_period_end: stripeSubscription.current_period_end
  }, null, 2));
  console.log('[webhook] Customer ID:', customerId);

  const priceId = stripeSubscription.items?.data?.[0]?.price?.id || null;
  const plan = planHint || stripeService.getPlanFromPriceId(priceId);

  console.log('[webhook] Resolved plan:', plan, 'priceId:', priceId);

  // Handle invalid dates from Stripe
  const startDate = stripeSubscription.current_period_start && !isNaN(stripeSubscription.current_period_start)
    ? new Date(stripeSubscription.current_period_start * 1000)
    : new Date();
  const endDate = stripeSubscription.current_period_end && !isNaN(stripeSubscription.current_period_end)
    ? new Date(stripeSubscription.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

  console.log('[webhook] Dates - startDate:', startDate, 'endDate:', endDate);

  user.subscription = {
    ...(user.subscription || {}),
    plan,
    stripeCustomerId: customerId ? String(customerId) : user.subscription?.stripeCustomerId || null,
    stripeSubscriptionId: stripeSubscription.id,
    stripeSubscriptionStatus: stripeSubscription.status,
    subscriptionStartDate: startDate,
    subscriptionEndDate: endDate,
    autoRenew: !stripeSubscription.cancel_at_period_end,
  };

  if (hasActiveSubscription(user) && user.checkInStatus !== 'emergency') {
    const effectiveState = getEffectiveDndState(user);
    if (effectiveState.dndReason === 'manual') {
      clearCheckInSchedule(user);
    } else if (
      effectiveState.dndReason === 'sleep' ||
      !user.nextCheckInAt ||
      user.nextCheckInAt <= new Date()
    ) {
      armCheckInWindowRespectingSleep(user);
    }
  } else if (!hasActiveSubscription(user)) {
    clearCheckInSchedule(user);
  }

  console.log('[webhook] User subscription object before save:', JSON.stringify(user.subscription, null, 2));

  await user.save();

  console.log('[webhook] User saved successfully');

  const historyPayload = buildHistoryPayload(stripeSubscription.id, plan, stripeSubscription);

  console.log('[webhook] Creating subscription history:', JSON.stringify(historyPayload, null, 2));

  await SubscriptionHistory.findOneAndUpdate(
    { stripeSubscriptionId: stripeSubscription.id },
    {
      user: user._id,
      ...historyPayload,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (isConversionStatus(stripeSubscription.status)) {
    await rewardReferrerForConversion(user);
  }

  console.log('[webhook] persistSubscriptionState - COMPLETE');
}

async function resolveUserByCustomer(customerId) {
  console.log('[webhook] resolveUserByCustomer - customerId:', customerId);

  if (!customerId) {
    console.log('[webhook] No customerId provided');
    return null;
  }

  let user = await User.findOne({
    'subscription.stripeCustomerId': String(customerId),
  });
  console.log('[webhook] Search by stripeCustomerId result:', user?._id || 'null');

  if (user) {
    return user;
  }

  try {
    const customer = await stripeService.getCustomer(String(customerId));
    console.log('[webhook] Stripe customer:', customer?.id, 'deleted:', customer?.deleted);

    const metadataUserId =
      customer && !customer.deleted ? customer.metadata?.userId : null;

    console.log('[webhook] metadataUserId from customer:', metadataUserId);

    if (metadataUserId) {
      user = await User.findById(metadataUserId);
      console.log('[webhook] User from metadata lookup:', user?._id || 'null');

      if (user) {
        user.subscription = user.subscription || {};
        user.subscription.stripeCustomerId = String(customerId);
        await user.save();
      }
      return user;
    }
  } catch (error) {
    console.error('[webhookController] Failed to resolve user from Stripe customer', customerId, error);
  }

  return null;
}

async function handleCheckoutCompleted(session) {
  console.log('[webhook] handleCheckoutCompleted - session:', JSON.stringify({
    id: session.id,
    userId: session.metadata?.userId,
    plan: session.metadata?.plan,
    subscription: session.subscription,
    customer: session.customer
  }, null, 2));

  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  console.log('[webhook] Looking for user with ID:', userId);

  const user = await User.findById(userId);
  if (!user) {
    console.error('[webhook] User not found:', userId);
    throw new Error(`User not found: ${userId}`);
  }

  console.log('[webhook] User found:', user._id, 'Current subscription:', JSON.stringify(user.subscription));

  const stripeSubscriptionId = session.subscription;
  console.log('[webhook] Getting subscription from Stripe:', stripeSubscriptionId);

  const stripeSubscription = await stripeService.getSubscription(stripeSubscriptionId);
  console.log('[webhook] Stripe subscription:', JSON.stringify({
    id: stripeSubscription.id,
    status: stripeSubscription.status,
    current_period_start: stripeSubscription.current_period_start,
    current_period_end: stripeSubscription.current_period_end,
    cancel_at_period_end: stripeSubscription.cancel_at_period_end
  }, null, 2));

  await persistSubscriptionState(user, stripeSubscription, session.customer, plan);

  console.log('[webhook] persistSubscriptionState completed for user:', user._id);
}

async function handleSubscriptionUpsert(subscription) {
  const user = await resolveUserByCustomer(subscription.customer);
  if (!user) {
    return;
  }

  await persistSubscriptionState(user, subscription, subscription.customer);
}

async function handleSubscriptionDeleted(subscription) {
  const user = await User.findOne({
    'subscription.stripeSubscriptionId': subscription.id,
  });

  if (!user) {
    return;
  }

  user.subscription = user.subscription || {};
  user.subscription.plan = 'free';
  user.subscription.stripeSubscriptionStatus = 'canceled';
  user.subscription.subscriptionEndDate = new Date();
  user.subscription.autoRenew = false;
  clearCheckInSchedule(user);

  await user.save();

  await SubscriptionHistory.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    { status: 'canceled', endDate: new Date() },
    { new: true },
  );
}

async function handleInvoicePaid(invoice) {
  const stripeSubscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!stripeSubscriptionId) {
    return;
  }

  const user = await resolveUserByCustomer(invoice.customer);
  if (!user) {
    return;
  }

  const stripeSubscription = await stripeService.getSubscription(stripeSubscriptionId);
  await persistSubscriptionState(user, stripeSubscription, invoice.customer);
}

async function handlePaymentFailed(invoice) {
  const user = await resolveUserByCustomer(invoice.customer);

  if (!user) return;

  user.subscription = user.subscription || {};
  user.subscription.stripeSubscriptionStatus = 'past_due';
  clearCheckInSchedule(user);
  await user.save();

  if (user.subscription?.stripeSubscriptionId) {
    await SubscriptionHistory.findOneAndUpdate(
      { stripeSubscriptionId: user.subscription.stripeSubscriptionId },
      { status: 'past_due' },
      { new: true },
    );
  }
}

module.exports = {
  handleWebhook,
};
