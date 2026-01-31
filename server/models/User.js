const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        required: true,
    },
    fcmToken: {
        type: String,
        default: null,
    },
    age: {
        type: Number,
        required: true,
    },
    dnd: {
        type: Boolean,
        required: true,
        default: false
    },
    // Client-side app state reported to the backend (used to suppress check-in alerts)
    isActive: {
        type: Boolean,
        default: false,
    },
    lastActiveAt: {
        type: Date,
        default: null,
    },
    checkInIntervalHours: {
        type: Number,
        default: 2,
    },
    emergencyCountdownMinutes: {
        type: Number,
        default: 2,
    },
    nextCheckInAt: {
        type: Date,
        default: null,
    },
    lastCheckIn: {
        type: Date,
        default: Date.now,
    },
    checkInStatus: {
        type: String,
        enum: ['ok', 'pending', 'emergency'],
        default: 'ok',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
