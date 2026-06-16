const User = require('../models/User');
const { appendClientLog } = require('../services/clientLogService');

const TARGET_USERNAMES = ['andrews10', 'Andytest2'];

exports.receiveClientLog = async (req, res) => {
  try {
    const { level, message, username: bodyUsername } = req.body;

    if (!level || !message) {
      return res.status(400).json({ message: 'level and message are required' });
    }

    let logUsername = bodyUsername;
    if (!logUsername) {
      const user = await User.findById(req.userId).select('username');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      logUsername = user.username;
    }

    if (TARGET_USERNAMES.includes(logUsername)) {
      appendClientLog(logUsername, level, message);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      message: 'Error processing client log',
      error: error.message,
    });
  }
};
