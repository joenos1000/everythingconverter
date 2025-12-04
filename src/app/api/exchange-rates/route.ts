import { NextRequest, NextResponse } from 'next/server';
import { convertCurrency, getExchangeRates, getCacheAge } from '@/lib/server/exchange-rates';

export const runtime = 'edge';

/**
 * GET /api/exchange-rates
 * Query params:
 *   - from: source currency code (required)
 *   - to: target currency code (required)
 *   - amount: amount to convert (optional, defaults to 1)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amountStr = searchParams.get('amount');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters: from and to' },
        { status: 400 }
      );
    }

    const amount = amountStr ? parseFloat(amountStr) : 1;

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number' },
        { status: 400 }
      );
    }

    const result = await convertCurrency(amount, from.toUpperCase(), to.toUpperCase());
    const cacheAge = getCacheAge();

    return NextResponse.json({
      ...result,
      cacheAge,
    });
  } catch (error) {
    console.error('Exchange rates API error:', error);

    const message = error instanceof Error ? error.message : 'Failed to fetch exchange rates';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exchange-rates/all
 * Returns all available exchange rates
 */
export async function POST() {
  try {
    const rates = await getExchangeRates();
    const cacheAge = getCacheAge();

    return NextResponse.json({
      ...rates,
      cacheAge,
    });
  } catch (error) {
    console.error('Exchange rates API error:', error);

    const message = error instanceof Error ? error.message : 'Failed to fetch exchange rates';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
