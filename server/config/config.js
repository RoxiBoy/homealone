module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'homealone_secret_key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID || '',
    yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID || '',
    successUrl: process.env.STRIPE_SUCCESS_URL || 'homealone://payment-success?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: process.env.STRIPE_CANCEL_URL || 'homealone://payment-cancel'
  }
};
