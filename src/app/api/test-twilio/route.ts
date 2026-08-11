import { NextResponse } from 'next/server';
import { getTwilioClient, sendSms } from '@/lib/twilio';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, testMessage } = body;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || accountSid.includes('placeholder')) {
      return NextResponse.json({
        success: false,
        error: 'TWILIO_ACCOUNT_SID is missing or configured with placeholder values in .env.local / .env',
      }, { status: 400 });
    }

    // Verify account SID and credentials by initializing client and listing numbers or checking account status
    const client = getTwilioClient();
    const accountInfo = await client.api.v2010.accounts(accountSid).fetch();

    if (!phone) {
      return NextResponse.json({
        success: true,
        status: accountInfo.status,
        friendlyName: accountInfo.friendlyName,
        messagingServiceSid: messagingServiceSid || 'Not set',
        phoneNumber: phoneNumber || 'Not set',
        message: 'Twilio API connection successful! Provide a "phone" number in POST body to test sending a real SMS.',
      });
    }

    // Test send SMS
    const smsResult = await sendSms({
      to: phone,
      body: testMessage || '🚨 Test SMS from Liable Alerts. Twilio integration is working successfully!',
    });

    return NextResponse.json({
      success: true,
      sid: smsResult.sid,
      status: smsResult.status,
      message: `SMS successfully sent to ${phone}`,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Twilio test failed',
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    const isConfigured = !!accountSid && !accountSid.includes('placeholder') && accountSid !== 'ACmock';

    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        message: 'Twilio credentials not configured yet.',
      });
    }

    const client = getTwilioClient();
    const accountInfo = await client.api.v2010.accounts(accountSid).fetch();

    return NextResponse.json({
      configured: true,
      accountSid: accountSid.substring(0, 6) + '...',
      status: accountInfo.status,
      friendlyName: accountInfo.friendlyName,
      messagingServiceSid: messagingServiceSid ? messagingServiceSid.substring(0, 6) + '...' : 'Not set',
      phoneNumber: phoneNumber || 'Not set',
    });
  } catch (error: any) {
    return NextResponse.json({
      configured: false,
      error: error.message,
    });
  }
}
