const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema(
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
    relationship: {
      type: String,
    },
    address: {
      type: String,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const EmergencyContact = mongoose.model('EmergencyContact', emergencyContactSchema);

module.exports = EmergencyContact;