const createEmailBody = (senderName, receiverName) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Emergency Check-In</title>
      </head>
      <body style="margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 24px;">
              <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background:#e53935; color:#ffffff; padding:20px; text-align:center;">
                    <h1 style="margin:0; font-size:22px;">Emergency Check-In</h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:24px; color:#333333;">
                    <p style="font-size:16px; line-height:1.5;">
                      Hi ${receiverName},
                    </p>

                    <p style="font-size:16px; line-height:1.5;">
                      <strong>${senderName}</strong> has triggered an emergency check-in using <strong>HomeAlone</strong>.
                    </p>

                    <p style="font-size:16px; line-height:1.5;">
                      This message means they may not be okay and could need support.
                    </p>

                    <p style="font-size:16px; line-height:1.5;">
                      Please try to reach out to them as soon as possible.
                    </p>

                    <hr style="border:none; border-top:1px solid #dddddd; margin:24px 0;" />

                    <p style="font-size:14px; color:#666666;">
                      If you believe this is an immediate emergency and cannot reach them,
                      consider contacting local emergency services.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f0f0f0; padding:16px; text-align:center; font-size:12px; color:#777777;">
                    Sent via HomeAlone • Emergency notification system
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};


const sendEmail = async (senderName, receiverName, receiverEmail) => {

    const emailBody = createEmailBody(senderName, receiverName) 

    try {

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
                "api-key": process.env.BREVO_API_KEY 
            },
            body: JSON.stringify({
                sender: {
                    name: "HomeAlone",
                    email: "saurab.developer@gmail.com"
                },
                to : [
                    {
                        name: receiverName,
                        email: receiverEmail
                    }
                ],
                subject: `Emergency alert for ${senderName}`,
                htmlContent: emailBody
            })
        })

        const data = await response.json()

        console.log(`Email sent successfully to email ${receiverEmail}: ${data}`)
        console.log(`[sendEmail] Brevo response:`, JSON.stringify(data, null, 2));
        
    } catch(err) {

        console.log(`Error sending emergency email: ${err}`)

    }

}


module.exports = {
    sendEmail
}




