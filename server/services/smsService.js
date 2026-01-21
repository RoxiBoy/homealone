const twilio = require('twilio')

const accountSid = process.env.TWILIO_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NO

const twilioClient = twilio(accountSid, authToken)

const sendSms = async ( userName, emergencyContact ) => {
    
    try {
        const message = await twilioClient.messages.create({
            body: `This is a message from HomeAlone, your friend ${userName} is in an emergency, please reach to them as soon as possible and help them as you can.`,
            from: twilioPhone,
            to: emergencyContact
        })
    }catch(err){
        console.log(`Error sending emergency Sms: ${err}`)
    }

}

module.exports = {
    sendSms
}














