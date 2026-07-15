import { NextResponse } from 'next/server';
import { getLiveMarketUpdate } from '../../../lib/sosovalue';
import { rateLimit } from '../../../lib/rate-limiter';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market-update
 * Retrieves raw live sector and spotlight performance data from SoSoValue.
 */
export async function GET(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const rateResult = rateLimit(ip);
    if (!rateResult.success) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const marketData = await getLiveMarketUpdate();
    return NextResponse.json({
      success: true,
      ...marketData
    });
  } catch (error) {
    console.error('Error fetching live market update in API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
