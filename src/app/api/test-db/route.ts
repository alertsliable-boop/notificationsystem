import { NextResponse } from 'next/server';


export async function GET() {
  try {
    const rawUrl = process.env.DATABASE_URL || 'UNDEFINED';
    return NextResponse.json({
      success: true,
      url: rawUrl.replace(/:[^:@]+@/, ':***@'),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
