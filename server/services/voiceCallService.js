const { twilio, getTwilioClient } = require('./twilioClient');

const getFromNumber = () => process.env.TWILIO_VOICE_PHONE_NO || process.env.TWILIO_PHONE_NO;

const buildEmergencyCallTwiml = ({ userName, recipientName }) => {
  const response = new twilio.twiml.VoiceResponse();

  const greeting = recipientName ? `Hello ${recipientName}. ` : '';
  const message =
    `${greeting}This is an automated emergency alert from HomeAlone. ` +
    `Your friend ${userName} may need immediate assistance. ` +
    `Please try to contact them right away.`;

  response.say({ voice: 'alice', language: 'en-US' }, message);
  response.pause({ length: 1 });
  response.say({ voice: 'alice', language: 'en-US' }, `Repeating. ${message}`);

  return response.toString();
};

const placeEmergencyCall = async (userName, toPhoneNumber, recipientName) => {
  const twilioClient = getTwilioClient();
  const from = getFromNumber();

  if (!twilioClient || !from) {
    console.log('[voiceCallService] Twilio Voice not configured - skipping call');
    return { ok: false, reason: 'twilio-not-configured' };
  }

  try {
    const twiml = buildEmergencyCallTwiml({ userName, recipientName });

    const call = await twilioClient.calls.create({
      to: toPhoneNumber,
      from,
      twiml,
    });

    console.log(
      `[voiceCallService] Call placed (sid=${call.sid}) for user ${userName} to contact ${toPhoneNumber}`,
    );

    return { ok: true, sid: call.sid };
  } catch (err) {
    console.error(`[voiceCallService] Error placing emergency call: ${err}`);
    return { ok: false, reason: 'call-error', error: err?.message || String(err) };
  }
};

module.exports = {
  placeEmergencyCall,
  buildEmergencyCallTwiml,
};
