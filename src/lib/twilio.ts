import twilio from 'twilio';

export function getTwilioClient(): twilio.Twilio {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;

  if (apiKey && apiSecret && apiKey.startsWith('SK')) {
    if (!accountSid || !accountSid.startsWith('AC')) {
      throw new Error('Twilio API Key authentication requires TWILIO_ACCOUNT_SID (starts with AC...)');
    }
    return twilio(apiKey, apiSecret, { accountSid });
  }

  if (accountSid && authToken && accountSid.startsWith('AC') && !authToken.includes('placeholder')) {
    return twilio(accountSid, authToken);
  }

  throw new Error('Twilio credentials (TWILIO_ACCOUNT_SID starting with AC... and TWILIO_AUTH_TOKEN or TWILIO_API_KEY / TWILIO_API_SECRET) are missing or invalid.');
}

/**
 * Send a single SMS via Twilio Messaging Service or From Phone Number.
 * Returns the Twilio MessageSid.
 */
export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<{ sid: string; status: string }> {
  const client = getTwilioClient();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;

  const payload: any = {
    to,
    body,
  };

  if (messagingServiceSid && !messagingServiceSid.includes('placeholder')) {
    payload.messagingServiceSid = messagingServiceSid;
  } else if (fromNumber && !fromNumber.includes('placeholder')) {
    payload.from = fromNumber;
  } else {
    throw new Error('Neither TWILIO_MESSAGING_SERVICE_SID nor TWILIO_PHONE_NUMBER is configured.');
  }

  if (statusCallback && !statusCallback.includes('localhost')) {
    payload.statusCallback = statusCallback;
  }

  const message = await client.messages.create(payload);

  return { sid: message.sid, status: message.status };
}

/**
 * Validate Twilio request signature (for status callbacks).
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || authToken.includes('placeholder')) return false;

  return twilio.validateRequest(
    authToken,
    signature,
    url,
    params
  );
}

