const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    relationship: {
      type: String,
    },
    priority: {
      type: Number,
      default: 3, // 1 = highest priority, 3 = lowest
      min: 1,
      max: 3
    }
  },
  {
    timestamps: true,
  }
);

const Friend = mongoose.model('Friend', friendSchema);

module.exports = Friend;