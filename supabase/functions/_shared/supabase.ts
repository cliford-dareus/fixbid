import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Deposit as 50% of total, rounded to cents (USD). */
export function depositFromTotal(totalAmount: number): number {
  const total = Number(totalAmount) || 0;
  return Math.round(total * 50) / 100;
}

/** Stripe wants integer cents. */
export function toCents(amountDollars: number): number {
  return Math.round(Number(amountDollars) * 100);
}
