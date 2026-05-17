const mongoose = require('mongoose');
const User = require('../models/User');
const Friend = require('../models/Friend');
const CheckInSession = require('../models/CheckInSession');
const EmergencyAlert = require('../models/EmergencyAlert');
const { getEffectiveDndState } = require('./sleepWindowService');
const { buildSubscriptionAccessPayload } = require('./subscriptionAccessService');

const REFERRAL_REWARD_CENTS_PER_CONVERSION = Number(
  process.env.REFERRAL_REWARD_CENTS_PER_CONVERSION || 1000,
);

function toObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  return new mongoose.Types.ObjectId(String(value));
}

function buildSubscriptionPayload(user) {
  return {
    plan: user.subscription?.plan || 'free',
    status: user.subscription?.stripeSubscriptionStatus || null,
    startDate: user.subscription?.subscriptionStartDate || null,
    endDate: user.subscription?.subscriptionEndDate || null,
    autoRenew: user.subscription?.autoRenew ?? true,
    ...buildSubscriptionAccessPayload(user),
  };
}

function buildSettingsPayload(user, now = new Date()) {
  const effectiveState = getEffectiveDndState(user, now);

  return {
    checkInIntervalHours: user.checkInIntervalHours ?? 2,
    emergencyCountdownMinutes: user.emergencyCountdownMinutes ?? 2,
    sleepTimerEnabled: user.sleepTimerEnabled === true,
    sleepStartHour: Number.isInteger(user.sleepStartHour) ? user.sleepStartHour : 21,
    sleepEndHour: Number.isInteger(user.sleepEndHour) ? user.sleepEndHour : 7,
    sleepTimezone: typeof user.sleepTimezone === 'string' ? user.sleepTimezone : 'UTC',
    dnd: user.dnd === true,
    effectiveDnd: effectiveState.effectiveDnd,
    dndReason: effectiveState.dndReason,
  };
}

function buildReferralPayload(user) {
  const explicitCents = Number(user.referralStats?.rewardCents || 0);
  const legacyMonths = Number(user.referralStats?.rewardMonths || 0);
  const rewardCents =
    explicitCents > 0
      ? explicitCents
      : legacyMonths * REFERRAL_REWARD_CENTS_PER_CONVERSION;

  return {
    code: user.referralCode || null,
    referredBy: user.referredBy ? user.referredBy.toString() : null,
    stats: {
      signups: Number(user.referralStats?.signups || 0),
      conversions: Number(user.referralStats?.conversions || 0),
      rewardCents,
      rewardDollars: rewardCents / 100,
    },
    rewardGrantedAt: user.referralRewardGrantedAt || null,
  };
}

function normalizeContact(contact) {
  return {
    id: contact._id.toString(),
    name: contact.name,
    phone: contact.phone,
    countryCode: contact.countryCode || '',
    email: contact.email || '',
    priority: contact.priority ?? 3,
    relationship: contact.relationship || '',
  };
}

function normalizeUserSummary(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    age: user.age,
    role: user.role || 'user',
    checkInStatus: user.checkInStatus || 'ok',
    createdAt: user.createdAt,
    lastCheckIn: user.lastCheckIn || null,
    lastActiveAt: user.lastActiveAt || null,
  };
}

function getSessionAnalyticsProjectionStage() {
  return {
    $addFields: {
      analyticsResolutionReason: {
        $ifNull: [
          '$resolutionReason',
          {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$status', 'ok'] },
                  then: 'ok',
                },
                {
                  case: { $eq: ['$status', 'emergency'] },
                  then: 'timeout_emergency',
                },
              ],
              default: null,
            },
          },
        ],
      },
    },
  };
}

function getMonthsObserved(firstDate, baseDate = new Date()) {
  if (!firstDate) {
    return 0;
  }

  const first = new Date(firstDate);
  const last = new Date(baseDate);
  const months =
    (last.getUTCFullYear() - first.getUTCFullYear()) * 12 +
    (last.getUTCMonth() - first.getUTCMonth()) +
    1;

  return Math.max(months, 1);
}

function roundMetric(value) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
}

function buildAverageBlock(totalAlarms, totalEmergencies, totalOkResponses, firstAlarmTime, now) {
  const monthsObserved = getMonthsObserved(firstAlarmTime, now);
  const yearsObserved = monthsObserved > 0 ? monthsObserved / 12 : 0;
  const okRate = totalAlarms > 0 ? totalOkResponses / totalAlarms : 0;

  return {
    monthlyAverages: {
      alarmsPerMonth: monthsObserved ? roundMetric(totalAlarms / monthsObserved) : 0,
      emergenciesPerMonth: monthsObserved ? roundMetric(totalEmergencies / monthsObserved) : 0,
      okRate: roundMetric(okRate),
    },
    yearlyAverages: {
      alarmsPerYear: yearsObserved ? roundMetric(totalAlarms / yearsObserved) : 0,
      emergenciesPerYear: yearsObserved ? roundMetric(totalEmergencies / yearsObserved) : 0,
      okRate: roundMetric(okRate),
    },
  };
}

async function getUserStatsAggregate(userId) {
  const objectId = toObjectId(userId);
  const [sessionRows, alertRows] = await Promise.all([
    CheckInSession.aggregate([
      { $match: { user: objectId } },
      getSessionAnalyticsProjectionStage(),
      {
        $group: {
          _id: '$user',
          totalAlarmsEver: { $sum: 1 },
          totalOkResponses: {
            $sum: {
              $cond: [{ $eq: ['$analyticsResolutionReason', 'ok'] }, 1, 0],
            },
          },
          totalMissedResponses: {
            $sum: {
              $cond: [{ $eq: ['$analyticsResolutionReason', 'timeout_emergency'] }, 1, 0],
            },
          },
          totalEmergencies: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$analyticsResolutionReason',
                    ['manual_emergency', 'timeout_emergency'],
                  ],
                },
                1,
                0,
              ],
            },
          },
          lastAlarmTime: { $max: '$createdAt' },
          lastCheckInOk: {
            $max: {
              $cond: [
                { $eq: ['$analyticsResolutionReason', 'ok'] },
                { $ifNull: ['$resolvedAt', '$updatedAt'] },
                null,
              ],
            },
          },
          firstAlarmTime: { $min: '$createdAt' },
        },
      },
    ]),
    EmergencyAlert.aggregate([
      { $match: { user: objectId } },
      {
        $group: {
          _id: '$user',
          lastContactTime: { $max: '$createdAt' },
          totalContactCallsEver: {
            $sum: {
              $cond: [{ $in: ['voice', '$channels'] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const sessionStats = sessionRows[0] || {};
  const alertStats = alertRows[0] || {};

  return {
    lastAlarmTime: sessionStats.lastAlarmTime || null,
    lastContactTime: alertStats.lastContactTime || null,
    lastCheckInOk: sessionStats.lastCheckInOk || null,
    totalAlarmsEver: sessionStats.totalAlarmsEver || 0,
    totalContactCallsEver: alertStats.totalContactCallsEver || 0,
    totalOkResponses: sessionStats.totalOkResponses || 0,
    totalMissedResponses: sessionStats.totalMissedResponses || 0,
    totalEmergencies: sessionStats.totalEmergencies || 0,
    firstAlarmTime: sessionStats.firstAlarmTime || null,
  };
}

async function getUserTrend(userId) {
  const objectId = toObjectId(userId);

  return CheckInSession.aggregate([
    { $match: { user: objectId } },
    getSessionAnalyticsProjectionStage(),
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        totalAlarms: { $sum: 1 },
        totalEmergencies: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$analyticsResolutionReason',
                  ['manual_emergency', 'timeout_emergency'],
                ],
              },
              1,
              0,
            ],
          },
        },
        okResponses: {
          $sum: {
            $cond: [{ $eq: ['$analyticsResolutionReason', 'ok'] }, 1, 0],
          },
        },
        missedResponses: {
          $sum: {
            $cond: [{ $eq: ['$analyticsResolutionReason', 'timeout_emergency'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        totalAlarms: 1,
        totalEmergencies: 1,
        okResponses: 1,
        missedResponses: 1,
      },
    },
  ]);
}

async function getUserDashboardStats(userId, options = {}) {
  const { includeFullUser = false } = options;
  const user = await User.findById(userId).select('-password').lean().exec();

  if (!user) {
    return null;
  }

  const [contacts, stats] = await Promise.all([
    Friend.find({ user: user._id }).sort({ priority: 1, createdAt: 1 }).lean().exec(),
    getUserStatsAggregate(user._id),
  ]);

  const response = {
    user: includeFullUser
      ? {
          ...user,
          id: user._id.toString(),
        }
      : {
          name: user.name,
          username: user.username,
          email: user.email,
          phone: user.phone,
        },
    settings: buildSettingsPayload(user),
    contacts: contacts.map(normalizeContact),
    subscription: buildSubscriptionPayload(user),
    referral: buildReferralPayload(user),
    stats: {
      lastAlarmTime: stats.lastAlarmTime,
      lastContactTime: stats.lastContactTime,
      lastCheckInOk: stats.lastCheckInOk || user.lastCheckIn || null,
      totalAlarmsEver: stats.totalAlarmsEver,
      totalContactCallsEver: stats.totalContactCallsEver,
      totalOkResponses: stats.totalOkResponses,
      totalMissedResponses: stats.totalMissedResponses,
      totalEmergencies: stats.totalEmergencies,
    },
  };

  if (includeFullUser) {
    const trend = await getUserTrend(user._id);
    const averages = buildAverageBlock(
      stats.totalAlarmsEver,
      stats.totalEmergencies,
      stats.totalOkResponses,
      stats.firstAlarmTime,
      new Date(),
    );

    response.user = {
      ...response.user,
      effectiveDnd: response.settings.effectiveDnd,
      dndReason: response.settings.dndReason,
    };
    response.trend = trend;
    response.monthlyAverages = averages.monthlyAverages;
    response.yearlyAverages = averages.yearlyAverages;
  }

  return response;
}

async function getAllUsersSummary(options = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;
  const search = typeof options.search === 'string' ? options.search.trim() : '';

  const query = search
    ? {
        role: { $ne: 'admin' },
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }
    : { role: { $ne: 'admin' } };

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select(
        'name username email phone age role checkInStatus subscription createdAt lastCheckIn lastActiveAt',
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec(),
  ]);

  const userIds = users.map(user => user._id);

  const [sessionRows, alertRows] = await Promise.all([
    userIds.length
      ? CheckInSession.aggregate([
          { $match: { user: { $in: userIds } } },
          getSessionAnalyticsProjectionStage(),
          {
            $group: {
              _id: '$user',
              totalAlarmsEver: { $sum: 1 },
              totalEmergencies: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$analyticsResolutionReason',
                        ['manual_emergency', 'timeout_emergency'],
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
      : [],
    userIds.length
      ? EmergencyAlert.aggregate([
          { $match: { user: { $in: userIds } } },
          {
            $group: {
              _id: '$user',
              totalContactCallsEver: {
                $sum: {
                  $cond: [{ $in: ['voice', '$channels'] }, 1, 0],
                },
              },
              lastContactTime: { $max: '$createdAt' },
            },
          },
        ])
      : [],
  ]);

  const sessionMap = new Map(sessionRows.map(row => [row._id.toString(), row]));
  const alertMap = new Map(alertRows.map(row => [row._id.toString(), row]));

  const items = users.map(user => {
    const id = user._id.toString();
    const sessionStats = sessionMap.get(id) || {};
    const alertStats = alertMap.get(id) || {};

    return {
      ...normalizeUserSummary(user),
      subscription: buildSubscriptionPayload(user),
      stats: {
        totalAlarmsEver: sessionStats.totalAlarmsEver || 0,
        totalEmergencies: sessionStats.totalEmergencies || 0,
        totalContactCallsEver: alertStats.totalContactCallsEver || 0,
        lastContactTime: alertStats.lastContactTime || null,
      },
    };
  });

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

async function getRecentAlerts(limit = 10) {
  const alerts = await EmergencyAlert.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name username email')
    .populate('contact', 'name phone countryCode email priority')
    .lean()
    .exec();

  return alerts.map(alert => ({
    id: alert._id.toString(),
    createdAt: alert.createdAt,
    status: alert.status,
    channels: Array.isArray(alert.channels) ? alert.channels : [],
    user: alert.user
      ? {
          id: alert.user._id.toString(),
          name: alert.user.name,
          username: alert.user.username,
          email: alert.user.email,
        }
      : null,
    contact: alert.contact
      ? {
          id: alert.contact._id.toString(),
          name: alert.contact.name,
          phone: alert.contact.phone,
          countryCode: alert.contact.countryCode || '',
          email: alert.contact.email || '',
          priority: alert.contact.priority ?? 3,
        }
      : null,
  }));
}

async function getGlobalStats() {
  const now = new Date();
  const activeSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeUsers, paidUsers, subscriptionRows, recentAlerts, perUserRows] =
    await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({
        role: { $ne: 'admin' },
        $or: [
          { lastActiveAt: { $gte: activeSince } },
          { lastCheckIn: { $gte: activeSince } },
        ],
      }),
      User.countDocuments({
        role: { $ne: 'admin' },
        'subscription.plan': { $in: ['monthly', 'yearly'] },
        'subscription.stripeSubscriptionStatus': { $in: ['active', 'trialing'] },
        $or: [
          { 'subscription.subscriptionEndDate': null },
          { 'subscription.subscriptionEndDate': { $gt: now } },
        ],
      }),
      User.aggregate([
        { $match: { role: { $ne: 'admin' } } },
        {
          $group: {
            _id: '$subscription.plan',
            count: { $sum: 1 },
          },
        },
      ]),
      getRecentAlerts(10),
      CheckInSession.aggregate([
        getSessionAnalyticsProjectionStage(),
        {
          $group: {
            _id: '$user',
            totalAlarmsEver: { $sum: 1 },
            totalEmergencies: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$analyticsResolutionReason',
                      ['manual_emergency', 'timeout_emergency'],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalOkResponses: {
              $sum: {
                $cond: [{ $eq: ['$analyticsResolutionReason', 'ok'] }, 1, 0],
              },
            },
            firstAlarmTime: { $min: '$createdAt' },
          },
        },
      ]),
    ]);

  const subscriptionBreakdown = {
    free: 0,
    monthly: 0,
    yearly: 0,
  };

  for (const row of subscriptionRows) {
    const key = row._id || 'free';
    if (Object.prototype.hasOwnProperty.call(subscriptionBreakdown, key)) {
      subscriptionBreakdown[key] = row.count;
    }
  }

  const knownCount =
    subscriptionBreakdown.free +
    subscriptionBreakdown.monthly +
    subscriptionBreakdown.yearly;

  if (knownCount < totalUsers) {
    subscriptionBreakdown.free += totalUsers - knownCount;
  }

  let alarmsAccumulator = 0;
  let emergenciesAccumulator = 0;
  let okRateAccumulator = 0;

  for (const row of perUserRows) {
    const monthsObserved = getMonthsObserved(row.firstAlarmTime, now);
    if (!monthsObserved) {
      continue;
    }

    alarmsAccumulator += row.totalAlarmsEver / monthsObserved;
    emergenciesAccumulator += row.totalEmergencies / monthsObserved;
    okRateAccumulator += row.totalAlarmsEver > 0 ? row.totalOkResponses / row.totalAlarmsEver : 0;
  }

  const divisor = perUserRows.length || 1;

  return {
    totalUsers,
    activeUsers,
    paidUsers,
    globalAverages: {
      alarmsPerUserPerMonth: roundMetric(alarmsAccumulator / divisor),
      emergenciesPerUserPerMonth: roundMetric(emergenciesAccumulator / divisor),
      avgOkRate: roundMetric(okRateAccumulator / divisor),
    },
    subscriptionBreakdown,
    recentAlerts,
  };
}

module.exports = {
  getUserDashboardStats,
  getUserTrend,
  getGlobalStats,
  getAllUsersSummary,
  getRecentAlerts,
};
