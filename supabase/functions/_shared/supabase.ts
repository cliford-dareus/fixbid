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

/** Deposit from total using optional percent (default 50), rounded to cents (USD). */
export function depositFromTotal(totalAmount: number, percent?: number | null): number {
  const total = Number(totalAmount) || 0;
  const pct =
    percent != null && Number(percent) > 0 && Number(percent) <= 100
      ? Number(percent)
      : 50;
  return Math.round(total * pct) / 100;
}

/** Stripe wants integer cents. */
export function toCents(amountDollars: number): number {
  return Math.round(Number(amountDollars) * 100);
}

/** Sum succeeded payment amounts for a quote. */
export async function sumPaidForQuote(
  supabase: SupabaseClient,
  quoteId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("payments")
    .select("amount, status")
    .eq("quote_id", quoteId);
  if (error) {
    console.warn("sumPaidForQuote", error.message);
    return 0;
  }
  return (data || []).reduce((sum, row) => {
    const st = (row.status || "succeeded").toLowerCase();
    if (st && st !== "succeeded" && st !== "paid" && st !== "complete") return sum;
    return sum + (Number(row.amount) || 0);
  }, 0);
}

/** Remaining balance (never negative), rounded to cents. */
export function balanceDue(totalAmount: number, paidAmount: number): number {
  const total = Number(totalAmount) || 0;
  const paid = Number(paidAmount) || 0;
  return Math.max(0, Math.round((total - paid) * 100) / 100);
}
