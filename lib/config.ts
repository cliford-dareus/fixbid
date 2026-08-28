/**
 * Client-safe configuration (EXPO_PUBLIC_* only).
 * Never put service-role or Stripe secret keys here.
 */

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

/** Hosted public quote page (Vercel). Override with EXPO_PUBLIC_PUBLIC_QUOTE_URL. */
export const PUBLIC_QUOTE_BASE =
  process.env.EXPO_PUBLIC_PUBLIC_QUOTE_URL?.replace(/\/$/, '') ||
  'https://fixbid-ten.vercel.app';

export function publicQuoteUrl(quoteId: string): string {
  return `${PUBLIC_QUOTE_BASE}/?id=${encodeURIComponent(quoteId)}`;
}

/** Public quote page focused on remaining balance (same page; status drives UI). */
export function publicBalanceUrl(quoteId: string): string {
  return `${PUBLIC_QUOTE_BASE}/?id=${encodeURIComponent(quoteId)}&pay=balance`;
}
