const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stripeSubscriptionId: {
    type: String,
    required: true
  },
  plan: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd'
  },
  status: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'incomplete', 'trialing', 'expired'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    default: 'card'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);