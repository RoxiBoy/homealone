const User = require('../models/User');
const {
  getAllUsersSummary,
  getGlobalStats,
  getUserDashboardStats,
} = require('../services/statsService');

exports.getStats = async (req, res, next) => {
  try {
    const stats = await getGlobalStats();
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const summary = await getAllUsersSummary({
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search,
    });

    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const dashboard = await getUserDashboardStats(req.params.id, {
      includeFullUser: true,
    });

    if (!dashboard) {
      return res.status(404).json({ message: 'User not found' });
    }

    const fullUser = await User.findById(req.params.id).select('-password').lean().exec();

    if (!fullUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      user: fullUser,
      settings: dashboard.settings,
      contacts: dashboard.contacts,
      subscription: dashboard.subscription,
      stats: dashboard.stats,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserDashboard = async (req, res, next) => {
  try {
    const dashboard = await getUserDashboardStats(req.params.id, {
      includeFullUser: true,
    });

    if (!dashboard) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(dashboard);
  } catch (error) {
    next(error);
  }
};
