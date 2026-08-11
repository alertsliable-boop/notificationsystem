import { NextResponse } from 'next/server';

// GET /api/health — simple liveness probe
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'liable-alerts-api',
  });
}
