const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Medicine', 'Checkup'],
      required: true,
    },
    dosage: {
      type: String,
    },
    frequency: {
      type: String,
    },
    time: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
    },
    address: {
      type: String,
    },
    notes: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = Reminder;
