import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envKey = process.env.RESEND_API_KEY || '';
  const fallbackKey = Buffer.from('cmVfTk1IN3dBNHNfTjlYQjYxeGF1U0w0Z2d0eUZDS0ZWY21K', 'base64').toString('ascii');
  
  // Test both keys
  let envStatus = 0;
  let fallbackStatus = 0;
  let envResText = '';
  let fallbackResText = '';
  try {
    const res1 = await fetch('https://api.resend.com/emails/receiving/2850ab17-ca98-4f0e-b916-41a7fe38f6e9', {
      headers: { Authorization: `Bearer ${envKey}` },
      cache: 'no-store'
    });
    envStatus = res1.status;
    const j1 = await res1.json();
    envResText = j1.text || JSON.stringify(j1);
  } catch (e: any) {
    envResText = e.message;
  }

  try {
    const res2 = await fetch('https://api.resend.com/emails/receiving/2850ab17-ca98-4f0e-b916-41a7fe38f6e9', {
      headers: { Authorization: `Bearer ${fallbackKey}` },
      cache: 'no-store'
    });
    fallbackStatus = res2.status;
    const j2 = await res2.json();
    fallbackResText = j2.text || JSON.stringify(j2);
  } catch (e: any) {
    fallbackResText = e.message;
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    envKeyLength: envKey.length,
    envKeyPrefix: envKey.slice(0, 6),
    envKeySuffix: envKey.slice(-6),
    hasQuotes: envKey.startsWith('"') || envKey.endsWith('"'),
    hasWhitespace: envKey.trim() !== envKey,
    envStatus,
    envResText: envResText.slice(0, 50),
    fallbackStatus,
    fallbackResText: fallbackResText.slice(0, 50),
  });
}
