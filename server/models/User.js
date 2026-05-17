const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

function sanitizeCodePart(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

function buildReferralCodeSeed(user) {
  const usernameSeed = sanitizeCodePart(user?.username);
  const nameSeed = sanitizeCodePart(user?.name);
  return (usernameSeed || nameSeed || 'HOME').slice(0, 4);
}

function randomCodeSuffix(length = 4) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

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
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
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
    sleepTimerEnabled: {
        type: Boolean,
        default: false,
    },
    sleepStartHour: {
        type: Number,
        default: 21,
        min: 0,
        max: 23,
    },
    sleepEndHour: {
        type: Number,
        default: 7,
        min: 0,
        max: 23,
    },
    sleepTimezone: {
        type: String,
        default: 'UTC',
        trim: true,
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
    lastUsageResetAt: {
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
    checkInHardDeadlineAt: {
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
    // Subscription fields for payment integration
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'monthly', 'yearly'],
            default: 'free'
        },
        stripeCustomerId: {
            type: String,
            default: null
        },
        stripeSubscriptionId: {
            type: String,
            default: null
        },
        stripeSubscriptionStatus: {
            type: String,
            enum: ['active', 'past_due', 'canceled', 'incomplete', 'trialing', null],
            default: null
        },
        subscriptionStartDate: {
            type: Date,
            default: null
        },
        subscriptionEndDate: {
            type: Date,
            default: null
        },
        autoRenew: {
            type: Boolean,
            default: true
        }
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true,
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },
    referralRewardGrantedAt: {
        type: Date,
        default: null,
    },
    referralStats: {
        signups: {
            type: Number,
            default: 0,
            min: 0,
        },
        conversions: {
            type: Number,
            default: 0,
            min: 0,
        },
        rewardMonths: {
            type: Number,
            default: 0,
            min: 0,
        },
        rewardCents: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('validate', async function (next) {
  try {
    if (this.referralCode) {
      return next();
    }

    const seed = buildReferralCodeSeed(this);
    const Model = this.constructor;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = `${seed}${randomCodeSuffix(4 + Math.min(attempt, 3))}`;
      // eslint-disable-next-line no-await-in-loop
      const exists = await Model.exists({ referralCode: candidate });
      if (!exists) {
        this.referralCode = candidate;
        return next();
      }
    }

    this.referralCode = `${seed}${Date.now().toString(36).toUpperCase().slice(-6)}`;
    return next();
  } catch (error) {
    return next(error);
  }
});

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
