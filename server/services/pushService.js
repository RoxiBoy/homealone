const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');

// Use GoogleAuth to obtain an access token for the FCM HTTP v1 API
async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const client = await auth.getClient();
  const result = await client.getAccessToken();
  const token = typeof result === 'string' ? result : result?.token;
  if (!token) {
    throw new Error('Failed to obtain access token for FCM HTTP v1');
  }
  return token;
}

// Sends a push notification via FCM HTTP v1 API to the given user for a check-in session.
// Requires:
// - process.env.FIREBASE_PROJECT_ID
// - GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON with FCM access
async function sendCheckInNotification(user, session) {
  if (!user.fcmToken) {
    console.log('[pushService] User has no fcmToken; skipping notification for', user._id.toString());
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.log('[pushService] FIREBASE_PROJECT_ID not set; cannot send push notification');
    return;
  }

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const nowMs = Date.now();
  const deadlineMs = session?.responseDeadline ? new Date(session.responseDeadline).getTime() : nowMs + 2 * 60 * 1000;
  const secondsUntilDeadline = Math.max(1, Math.round((deadlineMs - nowMs) / 1000));
  // Keep message alive long enough to survive short doze delays.
  const ttlSeconds = Math.max(120, Math.min(secondsUntilDeadline + 120, 1800));
  const configuredAlarmRingSeconds = Number(process.env.CHECKIN_ALARM_RING_SECONDS);
  const alarmRingSeconds = Math.max(
    10,
    Math.min(
      Number.isFinite(configuredAlarmRingSeconds)
        ? configuredAlarmRingSeconds
        : secondsUntilDeadline,
      120,
    ),
  );

  const body = {
    message: {
      token: user.fcmToken,
      // Data-only: no notification payload so Android delivers to the background
      // handler, which displays the full-screen alarm with proper sound/vibration.
      data: {
        type: 'checkin',
        sessionId: session._id.toString(),
        alertMode: 'full_screen',
        title: 'HomeAlone check-in',
        body: 'Are you okay? Tap to respond now.',
        alarmRingSeconds: String(alarmRingSeconds),
      },
      android: {
        priority: 'HIGH',
        ttl: `${ttlSeconds}s`,
        direct_boot_ok: true,
        collapse_key: 'homealone-checkin',
        notification: {
          channel_id: 'checkin-alerts-alarm-v4',
          sound: 'alarm',
          priority: 'PRIORITY_MAX',
          visibility: 'PUBLIC',
          notification_priority: 'PRIORITY_MAX',
          default_vibrate_timings: true,
          default_light_settings: true,
        },
      },
    },
  };

  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const accessToken = await getAccessToken();

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const payload = await res.json().catch(() => ({}));
        console.log(
          '[pushService] FCM HTTP v1 notification sent for session',
          session._id.toString(),
          'name=',
          payload?.name || 'n/a',
        );
        return;
      }

      const text = await res.text();
      console.error(
        '[pushService] FCM HTTP v1 error',
        res.status,
        text,
        'attempt',
        attempt + 1,
        'of',
        MAX_RETRIES + 1,
      );

      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (err) {
      console.error(
        '[pushService] Error sending FCM HTTP v1 notification',
        err,
        'attempt',
        attempt + 1,
        'of',
        MAX_RETRIES + 1,
      );

      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

async function sendTestNotification(user) {
  if (!user.fcmToken) {
    console.log('[pushService] User has no fcmToken; skipping test notification for', user._id.toString());
    return {
      ok: false,
      reason: 'no-fcm-token',
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.log('[pushService] FIREBASE_PROJECT_ID not set; cannot send test push notification');
    return {
      ok: false,
      reason: 'no-project-id',
    };
  }

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const body = {
    message: {
      token: user.fcmToken,
      notification: {
        title: 'HomeAlone test notification',
        body: 'If you see this, FCM is configured correctly.',
      },
      data: {
        type: 'test',
      },
      android: {
        priority: 'HIGH',
        notification: {
          channel_id: 'checkin-alerts-alarm-v4',
          sound: 'alarm',
          visibility: 'PUBLIC',
          notification_priority: 'PRIORITY_MAX',
          default_vibrate_timings: true,
          default_light_settings: true,
        },
      },
    },
  };

  try {
    const accessToken = await getAccessToken();

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[pushService] FCM HTTP v1 test error', res.status, text);
      return {
        ok: false,
        reason: 'fcm-error',
        status: res.status,
        body: text,
      };
    }

    console.log('[pushService] FCM HTTP v1 test notification sent for user', user._id.toString());
    return { ok: true };
  } catch (err) {
    console.error('[pushService] Error sending FCM HTTP v1 test notification', err);
    return {
      ok: false,
      reason: 'exception',
      error: err?.message || String(err),
    };
  }
}

async function sendReminderNotification(user, reminder, context) {
  if (!user.fcmToken) {
    console.log('[pushService] User has no fcmToken; skipping reminder notification for', user._id.toString());
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.log('[pushService] FIREBASE_PROJECT_ID not set; cannot send push notification');
    return;
  }

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const isMedicine = reminder.type === 'Medicine';
  const title = isMedicine
    ? 'Time for your medication'
    : context === 'appointment-now'
      ? 'Appointment time'
      : 'Upcoming appointment';

  const body = isMedicine
    ? `${reminder.title}${reminder.dosage ? ` — ${reminder.dosage}` : ''}`
    : context === 'appointment-now'
      ? `${reminder.title} is scheduled now${reminder.address ? ` at ${reminder.address}` : ''}`
      : `Reminder: ${reminder.title}${reminder.date ? ` on ${new Date(reminder.date).toLocaleDateString()}` : ''}`;

  const payload = {
    message: {
      token: user.fcmToken,
      data: {
        type: 'reminder',
        reminderId: reminder._id.toString(),
        reminderType: reminder.type,
        context: context || 'medicine',
        title,
        body,
      },
      android: {
        priority: 'HIGH',
        ttl: '3600s',
        direct_boot_ok: true,
      },
    },
  };

  try {
    const accessToken = await getAccessToken();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[pushService] FCM reminder error', res.status, text);
    } else {
      const result = await res.json().catch(() => ({}));
      console.log('[pushService] Reminder notification sent for', reminder._id.toString(), 'name=', result?.name || 'n/a');
    }
  } catch (err) {
    console.error('[pushService] Error sending reminder notification', err);
  }
}

module.exports = {
  sendCheckInNotification,
  sendTestNotification,
  sendReminderNotification,
};
