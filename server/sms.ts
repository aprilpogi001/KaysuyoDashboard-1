import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('Twilio credentials are not set in environment variables');
    return null;
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

function getTwilioClient() {
  if (TWILIO_ACCOUNT_SID === 'YOUR_ACCOUNT_SID_HERE' || 
      TWILIO_AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
    return null;
  }

  try {
    return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } catch (error) {
    console.error('Twilio initialization error:', error);
    return null;
  }
}

interface SendSMSParams {
  phoneNumber: string;
  message: string;
}

export async function sendSMS({ phoneNumber, message }: SendSMSParams): Promise<boolean> {
  try {
    const client = getTwilioClient();

    if (!client) {
      console.log("Twilio not configured. SMS not sent.");
      console.log(`Would send to ${phoneNumber}: ${message}`);
      return false;
    }

    if (TWILIO_PHONE_NUMBER === 'YOUR_PHONE_NUMBER_HERE') {
      console.log("Twilio phone number not configured. SMS not sent.");
      return false;
    }

    let formattedNumber = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '+63' + formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+63' + formattedNumber;
    }

    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedNumber
    });

    if (result.sid) {
      console.log(`✓ SMS sent to ${formattedNumber}: ${result.sid}`);
      return true;
    } else {
      console.error(`✗ SMS failed to ${formattedNumber}`);
      return false;
    }
  } catch (error: any) {
    console.error("SMS sending error:", error.message || error);
    return false;
  }
}