const { getTwilioClient } = require('./twilioClient');

const getFromNumber = () => process.env.TWILIO_PHONE_NO;

const buildEmergencySmsBody = (userName) =>
  `This is a message from HomeAlone. Your friend ${userName} is in an emergency. Please reach them as soon as possible and help them as you can.`;

const sendSms = async (userName, emergencyContact) => {
  const twilioClient = getTwilioClient();
  const from = getFromNumber();

  if (!twilioClient || !from) {
    console.log('[smsService] Twilio SMS not configured - skipping send');
    return { ok: false, reason: 'twilio-not-configured' };
  }

  try {
    const message = await twilioClient.messages.create({
      body: buildEmergencySmsBody(userName),
      from,
      to: emergencyContact,
    });

    console.log(
      `[smsService] Message sent (sid=${message.sid}) for user ${userName} to contact ${emergencyContact}`,
    );

    return { ok: true, sid: message.sid };
  } catch (err) {
    console.log(`[smsService] Error sending emergency SMS: ${err}`);
    return { ok: false, reason: 'send-error', error: err?.message || String(err) };
  }
};

module.exports = {
  sendSms,
  buildEmergencySmsBody,
};














