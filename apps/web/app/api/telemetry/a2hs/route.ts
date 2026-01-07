import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json().catch(() => null);
    // Minimal validation
    if (!data || typeof data.event !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // For now, just log to server console. In future, forward to analytics/logs.
    // Include user agent and path for basic context.
    const ua = req.headers.get('user-agent') || '';
    const ref = req.headers.get('referer') || '';
    console.info('[A2HS]', { ...data, ua, ref });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
