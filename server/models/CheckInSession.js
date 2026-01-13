const mongoose = require('mongoose');

const checkInSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'ok', 'emergency', 'expired'],
      default: 'pending',
    },
    responseDeadline: {
      type: Date,
      required: true,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

const CheckInSession = mongoose.model('CheckInSession', checkInSessionSchema);

module.exports = CheckInSession;
