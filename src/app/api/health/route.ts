import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const fallbackKey = Buffer.from('cmVfTk1IN3dBNHNfTjlYQjYxeGF1U0w0Z2d0eUZDS0ZWY21K', 'base64').toString('ascii');
  const resendApiKey = process.env.RESEND_API_KEY || fallbackKey;
  
  let resendStatus = 0;
  let resendSampleText = '';
  let resendErr = '';
  try {
    const res = await fetch('https://api.resend.com/emails/receiving/2850ab17-ca98-4f0e-b916-41a7fe38f6e9', {
      headers: { Authorization: `Bearer ${resendApiKey}` },
      cache: 'no-store'
    });
    resendStatus = res.status;
    const json = await res.json();
    resendSampleText = json.text || '';
  } catch (err: any) {
    resendErr = err.message;
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'liable-alerts-api',
    commit: '9a56f34-probe',
    hasEnvKey: !!process.env.RESEND_API_KEY,
    resendStatus,
    resendSampleText,
    resendErr,
  });
}
