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

  const body = {
    message: {
      token: user.fcmToken,
      notification: {
        title: 'HomeAlone check-in',
        body: 'Please confirm you are okay.',
      },
      data: {
        type: 'checkin',
        sessionId: session._id.toString(),
      },
      android: {
        priority: 'HIGH',
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
      console.error('[pushService] FCM HTTP v1 error', res.status, text);
    } else {
      console.log('[pushService] FCM HTTP v1 notification sent for session', session._id.toString());
    }
  } catch (err) {
    console.error('[pushService] Error sending FCM HTTP v1 notification', err);
  }
}

module.exports = {
  sendCheckInNotification,
};
