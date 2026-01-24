const twilio = require('twilio');

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.log('[twilioClient] TWILIO_SID / TWILIO_AUTH_TOKEN not configured');
    return null;
  }

  try {
    return twilio(accountSid, authToken);
  } catch (err) {
    console.error('[twilioClient] Failed to initialize Twilio client:', err);
    return null;
  }
};

module.exports = {
  twilio,
  getTwilioClient,
};
