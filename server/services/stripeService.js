const Stripe = require('stripe');
const config = require('../config/config');

const stripe = new Stripe(config.stripe.secretKey);

const PRICES = {
  monthly: config.stripe.monthlyPriceId,
  yearly: config.stripe.yearlyPriceId
};

function getPlanFromPriceId(priceId) {
  if (!priceId) {
    return 'monthly';
  }

  if (priceId === config.stripe.yearlyPriceId) {
    return 'yearly';
  }

  return 'monthly';
}

async function createOrGetCustomer(user) {
  console.log('[stripeService] createOrGetCustomer - user:', user._id);
  
  // Safety check: initialize subscription if undefined
  if (!user.subscription) {
    console.log('[stripeService] User subscription is undefined, initializing...');
    user.subscription = { plan: 'free' };
  }
  
  if (user.subscription.stripeCustomerId) {
    console.log('[stripeService] Using existing stripeCustomerId:', user.subscription.stripeCustomerId);
    return user.subscription.stripeCustomerId;
  }

  console.log('[stripeService] Creating new Stripe customer...');
  
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    phone: user.phone,
    metadata: {
      userId: user._id.toString()
    }
  });

  console.log('[stripeService] New customer created:', customer.id);

  return customer.id;
}

async function createCheckoutSession(user, plan) {
  const priceId = PRICES[plan];
  if (!priceId) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  const customerId = await createOrGetCustomer(user);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: config.stripe.successUrl.replace('{CHECKOUT_SESSION_ID}', '{CHECKOUT_SESSION_ID}'),
    cancel_url: config.stripe.cancelUrl,
    metadata: {
      userId: user._id.toString(),
      plan: plan
    }
  });

  return session;
}

async function getSubscription(subscriptionId) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });
}

async function getCustomer(customerId) {
  return stripe.customers.retrieve(customerId);
}

async function cancelSubscription(subscriptionId, immediately = false) {
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }
  
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
}

async function reactivateSubscription(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false
  });
}

async function constructWebhookEvent(payload, signature) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );
}

module.exports = {
  stripe,
  createOrGetCustomer,
  createCheckoutSession,
  getSubscription,
  getCustomer,
  getPlanFromPriceId,
  cancelSubscription,
  reactivateSubscription,
  constructWebhookEvent
};
