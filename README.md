This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Everything Converter

A universal conversion tool powered by AI that can convert between any units, concepts, or values. Features include:

- **AI-Powered Conversions**: Convert anything using natural language
- **Live Currency Exchange**: Accurate, real-time currency conversions using Open Exchange Rates API
- **Multiple UI Variants**: Classic, Terminal, Tron, Orb, Minimal, Tunnel, and Raw interfaces
- **Smart Detection**: Automatically detects currency conversions and uses live exchange rates

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Required: OpenRouter API key for AI conversions
OPENROUTER_API_KEY=your_openrouter_api_key

# Required: Open Exchange Rates API key for currency conversions
# Get your free API key at: https://openexchangerates.org/signup/free
OPEN_EXCHANGE_RATES_API_KEY=your_api_key_here
```

### Getting API Keys

1. **OpenRouter API Key**: Sign up at [OpenRouter](https://openrouter.ai/) to get your API key
2. **Open Exchange Rates API Key**: Sign up for a free account at [Open Exchange Rates](https://openexchangerates.org/signup/free)
   - Free tier includes 1,000 requests/month with hourly updates
   - Perfect for personal projects and development

## Currency Conversion

The app automatically detects currency conversions and uses live exchange rates. Supported currencies include:

- **Major currencies**: USD ($), EUR (€), GBP (£), JPY (¥), CHF, CAD, AUD, NZD
- **Asian currencies**: CNY, INR, KRW, THB, MYR, PHP, IDR, VND
- **And many more**: 40+ fiat currencies plus BTC and ETH

### Usage Examples

- "100 USD to EUR"
- "$ to pounds"
- "1000 yen to dollars"
- "50 euros to canadian dollars"

The converter will automatically fetch current exchange rates and provide accurate conversions with rate information.

## Getting Started

First, install dependencies:

```bash
npm install
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
