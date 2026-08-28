import {supabase} from '@/lib/supabase';
import {mapQuoteRow, quoteUpdatesToDb} from './mappers';
import {recordRevision, snapshotFromQuote} from './revisions';
import {err, ok, type Result} from './result';
import type {CreateQuoteInput, Quote} from './types';

const QUOTE_SELECT = `
  id,
  client_id,
  client_name,
  client_phone,
  job_name,
  notes,
  total_amount,
  status,
  created_at,
  photos,
  handyman_id,
  inclusions,
  exclusions,
  warranty_text,
  deposit_percent,
  valid_until,
  quote_line_items (
    id,
    description,
    quantity,
    unit_price,
    is_labor,
    photo_url
  )
`;

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function listQuotes(handymanId: string): Promise<Result<Quote[]>> {
  try {
    const {data, error} = await supabase
      .from('quotes')
      .select(QUOTE_SELECT)
      .eq('handyman_id', handymanId)
      .order('created_at', {ascending: false});

    if (error) return err(error);
    return ok((data || []).map(mapQuoteRow));
  } catch (e) {
    return err(e, 'Failed to load quotes');
  }
}

export async function getQuote(id: string): Promise<Result<Quote>> {
  try {
    const {data, error} = await supabase
      .from('quotes')
      .select(QUOTE_SELECT)
      .eq('id', id)
      .single();

    if (error) return err(error);
    return ok(mapQuoteRow(data));
  } catch (e) {
    return err(e, 'Failed to load quote');
  }
}

export async function createQuote(input: CreateQuoteInput): Promise<Result<Quote>> {
  try {
    const status = input.status ?? 'draft';
    const deposit =
      input.deposit_percent != null && input.deposit_percent > 0
        ? input.deposit_percent
        : 50;

    let validUntil = input.valid_until ?? null;
    if (status === 'sent' && !validUntil) {
      validUntil = addDaysIso(30);
    }

    const {data: quote, error: quoteError} = await supabase
      .from('quotes')
      .insert({
        handyman_id: input.handyman_id,
        client_name: input.client_name,
        client_phone: input.client_phone ?? null,
        client_id: input.client_id ?? null,
        job_name: input.job_name,
        notes: input.notes ?? null,
        photos: input.photos ?? [],
        total_amount: input.total_amount,
        status,
        inclusions: input.inclusions ?? null,
        exclusions: input.exclusions ?? null,
        warranty_text: input.warranty_text ?? null,
        deposit_percent: deposit,
        valid_until: validUntil,
      })
      .select()
      .single();

    if (quoteError) return err(quoteError);

    if (input.line_items.length > 0) {
      const rows = input.line_items.map((li) => ({
        quote_id: quote.id,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        is_labor: li.is_labor ?? false,
        photo_url: li.photo_url ?? null,
      }));

      const {error: lineError} = await supabase.from('quote_line_items').insert(rows);
      if (lineError) return err(lineError);
    }

    return getQuote(quote.id);
  } catch (e) {
    return err(e, 'Failed to create quote');
  }
}

export async function updateQuote(
  id: string,
  updates: Partial<Quote>,
): Promise<Result<void>> {
  try {
    const dbUpdates = quoteUpdatesToDb(updates);

    // When marking sent, set valid_until if missing
    if (updates.status === 'sent' && updates.valid_until === undefined) {
      const {data: existing} = await supabase
        .from('quotes')
        .select('valid_until')
        .eq('id', id)
        .maybeSingle();
      if (!existing?.valid_until) {
        dbUpdates.valid_until = addDaysIso(30);
      }
    }

    if (Object.keys(dbUpdates).length === 0) return ok(undefined);

    const {error} = await supabase.from('quotes').update(dbUpdates).eq('id', id);
    if (error) return err(error);
    return ok(undefined);
  } catch (e) {
    return err(e, 'Failed to update quote');
  }
}

/**
 * Replace all line items and update total (for revise-and-resend).
 * Records an immutable revision snapshot of the *previous* state first.
 */
export async function replaceLineItems(
  quoteId: string,
  lineItems: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    is_labor?: boolean;
    photo_url?: string | null;
  }>,
  totalAmount: number,
  opts?: {reason?: string; note?: string | null; newStatus?: string},
): Promise<Result<Quote>> {
  try {
    const before = await getQuote(quoteId);
    if (!before.ok) return before;

    const prev = before.data;
    const newStatus = opts?.newStatus ?? 'draft';
    const reason = opts?.reason ?? 'revise';

    if (prev.handyman_id) {
      const rev = await recordRevision({
        quoteId,
        handymanId: prev.handyman_id,
        reason,
        previousStatus: prev.status,
        newStatus,
        previousTotal: prev.total_amount,
        newTotal: totalAmount,
        snapshot: snapshotFromQuote(prev),
        note: opts?.note ?? null,
      });
      if (!rev.ok) {
        console.warn('revision record failed', rev.error);
      }
    }

    const {error: delErr} = await supabase
      .from('quote_line_items')
      .delete()
      .eq('quote_id', quoteId);
    if (delErr) return err(delErr);

    if (lineItems.length > 0) {
      const rows = lineItems.map((li) => ({
        quote_id: quoteId,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        is_labor: li.is_labor ?? false,
        photo_url: li.photo_url ?? null,
      }));
      const {error: insErr} = await supabase.from('quote_line_items').insert(rows);
      if (insErr) return err(insErr);
    }

    const patch: Record<string, unknown> = {
      total_amount: totalAmount,
      status: newStatus,
    };
    if (newStatus === 'sent') {
      patch.valid_until = prev.valid_until || addDaysIso(30);
    }

    const {error: upErr} = await supabase.from('quotes').update(patch).eq('id', quoteId);
    if (upErr) return err(upErr);

    return getQuote(quoteId);
  } catch (e) {
    return err(e, 'Failed to update line items');
  }
}

export async function deleteQuote(id: string): Promise<Result<void>> {
  try {
    await supabase.from('quote_line_items').delete().eq('quote_id', id);
    const {error} = await supabase.from('quotes').delete().eq('id', id);
    if (error) return err(error);
    return ok(undefined);
  } catch (e) {
    return err(e, 'Failed to delete quote');
  }
}
