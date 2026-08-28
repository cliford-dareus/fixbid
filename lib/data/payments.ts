import {supabase} from '@/lib/supabase';
import {err, ok, type Result} from './result';
import type {Payment} from './types';

export type PaymentRecord = Payment & {
  id?: string;
  quote_id?: string | null;
  type?: string;
  status?: string;
  source?: string | null;
  created_at?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPaymentRow(row: Record<string, any>): PaymentRecord {
  return {
    id: row.id,
    amount: Number(row.amount) || 0,
    type: row.type || 'deposit',
    status: row.status || 'succeeded',
    method: row.method,
    date: row.created_at || row.date,
    at: row.created_at || row.at,
    stripe_payment_intent_id: row.stripe_payment_intent_id,
    quote_id: row.quote_id,
    source: row.source,
    created_at: row.created_at,
  };
}

/** Stripe deposits and other rows on the payments table (by quote). */
export async function listByQuoteId(quoteId: string): Promise<Result<PaymentRecord[]>> {
  try {
    const {data, error} = await supabase
      .from('payments')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', {ascending: true});

    if (error) return err(error);
    return ok((data || []).map(mapPaymentRow));
  } catch (e) {
    return err(e, 'Failed to load payments');
  }
}

export async function recordManualPayment(input: {
  handymanId: string;
  quoteId?: string | null;
  clientId?: string | null;
  amount: number;
  type?: string;
  note?: string | null;
}): Promise<Result<PaymentRecord>> {
  try {
    const {data, error} = await supabase
      .from('payments')
      .insert({
        handyman_id: input.handymanId,
        quote_id: input.quoteId ?? null,
        client_id: input.clientId ?? null,
        amount: input.amount,
        currency: 'usd',
        type: input.type || 'payment',
        status: 'succeeded',
        source: 'manual',
        customer_email: null,
      })
      .select()
      .single();

    if (error) return err(error);
    return ok(mapPaymentRow(data));
  } catch (e) {
    return err(e, 'Failed to record payment');
  }
}

/** Merge job.payments JSON + payments table rows (dedupe by stripe PI / amount+date). */
export function mergePaymentLists(
  jobPayments: Payment[] | undefined,
  tablePayments: PaymentRecord[],
): PaymentRecord[] {
  const out: PaymentRecord[] = [];
  const seenPi = new Set<string>();

  for (const p of tablePayments) {
    if (p.stripe_payment_intent_id) seenPi.add(p.stripe_payment_intent_id);
    out.push(p);
  }

  for (const p of jobPayments || []) {
    const pi = p.stripe_payment_intent_id;
    if (pi && seenPi.has(pi)) continue;
    out.push({
      amount: Number(p.amount) || 0,
      type: p.type || 'payment',
      method: p.method,
      date: p.date || p.at,
      at: p.at || p.date,
      stripe_payment_intent_id: pi,
      source: pi ? 'stripe' : 'job',
    });
  }

  out.sort((a, b) => {
    const ta = new Date(a.created_at || a.date || a.at || 0).getTime();
    const tb = new Date(b.created_at || b.date || b.at || 0).getTime();
    return ta - tb;
  });

  return out;
}
