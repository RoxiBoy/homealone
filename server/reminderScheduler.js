const User = require('./models/User');
const Reminder = require('./models/Reminder');
const { sendReminderNotification } = require('./services/pushService');
const { hasActiveSubscription } = require('./services/subscriptionAccessService');

const SCHEDULER_INTERVAL_MS = 60_000;

function pad(n) {
  return n.toString().padStart(2, '0');
}

function formatHHmm(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getTodayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDaysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function schedulerTick() {
  const now = new Date();
  const currentTime = formatHHmm(now);
  const todayStart = getTodayStart();

  try {
    // --- Medicine Reminders ---
    const medicineReminders = await Reminder.find({
      type: 'Medicine',
      isActive: true,
      times: currentTime,
      $or: [
        { lastNotifiedAt: null },
        { lastNotifiedAt: { $lt: todayStart } },
      ],
    }).populate('user').exec();

    for (const reminder of medicineReminders) {
      try {
        if (!reminder.user) continue;
        if (!hasActiveSubscription(reminder.user, now)) continue;
        if (reminder.user.dnd) continue;

        await sendReminderNotification(reminder.user, reminder, 'medicine');
        reminder.lastNotifiedAt = now;
        await reminder.save();
      } catch (err) {
        console.error('[ReminderScheduler] Error processing medicine reminder', reminder._id.toString(), err);
      }
    }

    // --- Checkup Reminders ---
    const threeDaysFromNow = getDaysFromNow(3);

    const checkupReminders = await Reminder.find({
      type: 'Checkup',
      isActive: true,
      date: { $gte: todayStart, $lte: threeDaysFromNow },
      $or: [
        { lastNotifiedAt: null },
        { lastNotifiedAt: { $lt: todayStart } },
      ],
    }).populate('user').exec();

    for (const reminder of checkupReminders) {
      try {
        if (!reminder.user) continue;
        if (!hasActiveSubscription(reminder.user, now)) continue;
        if (reminder.user.dnd) continue;

        const apptDate = new Date(reminder.date);
        const apptDateStr = formatHHmm(apptDate);

        let context;
        if (apptDateStr === currentTime && reminder.time === currentTime) {
          context = 'appointment-now';
        } else if (reminder.time === currentTime || currentTime === '08:00') {
          context = 'appointment-upcoming';
        } else {
          continue;
        }

        await sendReminderNotification(reminder.user, reminder, context);
        reminder.lastNotifiedAt = now;
        await reminder.save();
      } catch (err) {
        console.error('[ReminderScheduler] Error processing checkup reminder', reminder._id.toString(), err);
      }
    }
  } catch (err) {
    console.error('[ReminderScheduler] Error in schedulerTick', err);
  }
}

function startReminderScheduler() {
  console.log('[ReminderScheduler] Starting scheduler with interval', SCHEDULER_INTERVAL_MS, 'ms');
  setInterval(schedulerTick, SCHEDULER_INTERVAL_MS);
}

module.exports = {
  startReminderScheduler,
};
