/**
 * Currency detection and conversion utilities
 */

// Map of currency keywords to ISO 4217 currency codes
export const CURRENCY_KEYWORDS: Record<string, string[]> = {
  USD: ['usd', 'dollar', 'dollars', '$', 'us dollar', 'us dollars', 'american dollar'],
  EUR: ['eur', 'euro', 'euros', '€'],
  GBP: ['gbp', 'pound', 'pounds', '£', 'british pound', 'sterling'],
  JPY: ['jpy', 'yen', '¥', 'japanese yen'],
  CHF: ['chf', 'franc', 'francs', 'swiss franc'],
  CAD: ['cad', 'canadian dollar', 'canadian dollars', 'c$'],
  AUD: ['aud', 'australian dollar', 'australian dollars', 'a$'],
  NZD: ['nzd', 'new zealand dollar', 'nz dollar'],
  CNY: ['cny', 'yuan', 'renminbi', 'rmb', 'chinese yuan'],
  INR: ['inr', 'rupee', 'rupees', '₹', 'indian rupee'],
  KRW: ['krw', 'won', '₩', 'korean won'],
  RUB: ['rub', 'ruble', 'rubles', '₽', 'russian ruble'],
  BRL: ['brl', 'real', 'r$', 'brazilian real'],
  ZAR: ['zar', 'rand', 'south african rand'],
  SEK: ['sek', 'krona', 'kronor', 'swedish krona'],
  NOK: ['nok', 'norwegian krone', 'norwegian kroner'],
  DKK: ['dkk', 'danish krone', 'danish kroner'],
  SGD: ['sgd', 'singapore dollar', 's$'],
  HKD: ['hkd', 'hong kong dollar', 'hk$'],
  MXN: ['mxn', 'peso', 'pesos', 'mexican peso'],
  THB: ['thb', 'baht', '฿', 'thai baht'],
  MYR: ['myr', 'ringgit', 'malaysian ringgit'],
  PHP: ['php', 'philippine peso', '₱'],
  IDR: ['idr', 'rupiah', 'indonesian rupiah'],
  PLN: ['pln', 'zloty', 'polish zloty'],
  TRY: ['try', '₺', 'lira', 'turkish lira'],
  AED: ['aed', 'dirham', 'uae dirham'],
  SAR: ['sar', 'riyal', 'saudi riyal'],
  ILS: ['ils', 'shekel', '₪', 'israeli shekel'],
  ARS: ['ars', 'argentine peso'],
  CLP: ['clp', 'chilean peso'],
  COP: ['cop', 'colombian peso'],
  EGP: ['egp', 'egyptian pound'],
  PKR: ['pkr', 'pakistani rupee'],
  BDT: ['bdt', 'taka', 'bangladeshi taka'],
  VND: ['vnd', '₫', 'dong', 'vietnamese dong'],
  NGN: ['ngn', 'naira', '₦', 'nigerian naira'],
  UAH: ['uah', 'hryvnia', '₴', 'ukrainian hryvnia'],
  CZK: ['czk', 'czech koruna', 'koruna'],
  HUF: ['huf', 'forint', 'hungarian forint'],
  RON: ['ron', 'leu', 'romanian leu'],
  BTC: ['btc', 'bitcoin', '₿'],
  ETH: ['eth', 'ethereum', 'ether'],
};

/**
 * Detect if a text contains a currency keyword
 * Returns the ISO currency code if found, null otherwise
 */
export function detectCurrency(text: string): string | null {
  const normalized = text.toLowerCase().trim();

  for (const [currencyCode, keywords] of Object.entries(CURRENCY_KEYWORDS)) {
    for (const keyword of keywords) {
      // Check for exact match or word boundary match
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(normalized) || normalized === keyword) {
        return currencyCode;
      }
    }
  }

  return null;
}

/**
 * Detect currency conversion intent from a conversion request
 * Returns { from: string, to: string } currency codes if detected, null otherwise
 */
export function detectCurrencyConversion(
  fromText: string,
  toText: string
): { from: string; to: string } | null {
  const fromCurrency = detectCurrency(fromText);
  const toCurrency = detectCurrency(toText);

  if (fromCurrency && toCurrency) {
    return {
      from: fromCurrency,
      to: toCurrency,
    };
  }

  return null;
}

/**
 * Extract numeric amount from text (e.g., "100 USD" -> 100)
 * Returns 1 if no number is found
 */
export function extractAmount(text: string): number {
  const match = text.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  return 1;
}

/**
 * Format currency code to display name
 */
export function getCurrencyDisplayName(code: string): string {
  const names: Record<string, string> = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    JPY: 'Japanese Yen',
    CHF: 'Swiss Franc',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
    NZD: 'New Zealand Dollar',
    CNY: 'Chinese Yuan',
    INR: 'Indian Rupee',
    KRW: 'Korean Won',
    RUB: 'Russian Ruble',
    BRL: 'Brazilian Real',
    ZAR: 'South African Rand',
    SEK: 'Swedish Krona',
    NOK: 'Norwegian Krone',
    DKK: 'Danish Krone',
    SGD: 'Singapore Dollar',
    HKD: 'Hong Kong Dollar',
    MXN: 'Mexican Peso',
    THB: 'Thai Baht',
    MYR: 'Malaysian Ringgit',
    PHP: 'Philippine Peso',
    IDR: 'Indonesian Rupiah',
    PLN: 'Polish Zloty',
    TRY: 'Turkish Lira',
    AED: 'UAE Dirham',
    SAR: 'Saudi Riyal',
    ILS: 'Israeli Shekel',
    ARS: 'Argentine Peso',
    CLP: 'Chilean Peso',
    COP: 'Colombian Peso',
    EGP: 'Egyptian Pound',
    PKR: 'Pakistani Rupee',
    BDT: 'Bangladeshi Taka',
    VND: 'Vietnamese Dong',
    NGN: 'Nigerian Naira',
    UAH: 'Ukrainian Hryvnia',
    CZK: 'Czech Koruna',
    HUF: 'Hungarian Forint',
    RON: 'Romanian Leu',
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
  };

  return names[code] || code;
}
