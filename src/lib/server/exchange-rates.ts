/**
 * Open Exchange Rates API integration
 * Free tier: 1,000 requests/month, hourly updates
 * API docs: https://docs.openexchangerates.org/
 */

interface ExchangeRatesResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
  base: string;
}

// In-memory cache for exchange rates (valid for 1 hour)
let cachedRates: CachedRates | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetch latest exchange rates from Open Exchange Rates API
 * Results are cached for 1 hour to avoid hitting API limits
 */
export async function getExchangeRates(): Promise<CachedRates> {
  const apiKey = process.env.OPEN_EXCHANGE_RATES_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPEN_EXCHANGE_RATES_API_KEY is not set. Get your free API key at https://openexchangerates.org/signup/free'
    );
  }

  // Check cache
  if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const url = `https://openexchangerates.org/api/latest.json?app_id=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Open Exchange Rates API key');
      }
      if (response.status === 429) {
        // Rate limit exceeded - return cached data if available
        if (cachedRates) {
          console.warn('Rate limit exceeded, returning cached rates');
          return cachedRates;
        }
        throw new Error('Rate limit exceeded and no cached data available');
      }
      throw new Error(`Open Exchange Rates API error: ${response.status}`);
    }

    const data: ExchangeRatesResponse = await response.json();

    // Update cache
    cachedRates = {
      rates: data.rates,
      timestamp: Date.now(),
      base: data.base,
    };

    return cachedRates;
  } catch (error) {
    // If fetch fails and we have cached data, return it
    if (cachedRates) {
      console.warn('Failed to fetch rates, returning cached data:', error);
      return cachedRates;
    }
    throw error;
  }
}

/**
 * Convert amount from one currency to another
 * @param amount - Amount to convert
 * @param from - Source currency code (e.g., 'USD')
 * @param to - Target currency code (e.g., 'EUR')
 * @returns Converted amount and rate information
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<{
  amount: number;
  convertedAmount: number;
  from: string;
  to: string;
  rate: number;
  timestamp: number;
  base: string;
}> {
  const ratesData = await getExchangeRates();
  const { rates, timestamp, base } = ratesData;

  // Check if currencies exist in rates
  if (!rates[from] && from !== base) {
    throw new Error(`Currency ${from} not found in exchange rates`);
  }
  if (!rates[to] && to !== base) {
    throw new Error(`Currency ${to} not found in exchange rates`);
  }

  // Calculate conversion rate
  // All rates are relative to USD (base), so we need to convert:
  // amount * (toRate / fromRate)
  const fromRate = from === base ? 1 : rates[from];
  const toRate = to === base ? 1 : rates[to];
  const conversionRate = toRate / fromRate;
  const convertedAmount = amount * conversionRate;

  return {
    amount,
    convertedAmount,
    from,
    to,
    rate: conversionRate,
    timestamp,
    base,
  };
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  const result = await convertCurrency(1, from, to);
  return result.rate;
}

/**
 * Format the cache age for display
 */
export function getCacheAge(): string | null {
  if (!cachedRates) return null;

  const ageMs = Date.now() - cachedRates.timestamp;
  const ageMinutes = Math.floor(ageMs / (60 * 1000));

  if (ageMinutes < 1) return 'just now';
  if (ageMinutes === 1) return '1 minute ago';
  if (ageMinutes < 60) return `${ageMinutes} minutes ago`;

  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours === 1) return '1 hour ago';
  return `${ageHours} hours ago`;
}
