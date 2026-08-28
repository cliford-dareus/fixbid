import {supabase} from '@/lib/supabase';
import {err, ok, type Result} from './result';
import type {Quote, QuoteRevision, QuoteRevisionSnapshot} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRevisionRow(row: Record<string, any>): QuoteRevision {
  return {
    id: row.id,
    quote_id: row.quote_id,
    handyman_id: row.handyman_id,
    revision_number: Number(row.revision_number) || 0,
    reason: row.reason ?? 'edit',
    previous_status: row.previous_status ?? null,
    new_status: row.new_status ?? null,
    previous_total: row.previous_total != null ? Number(row.previous_total) : null,
    new_total: row.new_total != null ? Number(row.new_total) : null,
    snapshot: (row.snapshot || {}) as QuoteRevisionSnapshot,
    note: row.note ?? null,
    created_at: row.created_at,
  };
}

export function snapshotFromQuote(quote: Quote): QuoteRevisionSnapshot {
  return {
    job_name: quote.job_name,
    notes: quote.notes ?? '',
    total_amount: Number(quote.total_amount) || 0,
    status: quote.status,
    client_name: quote.client_name,
    line_items: (quote.quote_line_items || []).map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unitPrice,
      is_labor: li.isLabor,
      photo_url: li.photo_url ?? null,
    })),
  };
}

export async function listRevisions(quoteId: string): Promise<Result<QuoteRevision[]>> {
  try {
    const {data, error} = await supabase
      .from('quote_revisions')
      .select('*')
      .eq('quote_id', quoteId)
      .order('revision_number', {ascending: false});

    if (error) return err(error);
    return ok((data || []).map(mapRevisionRow));
  } catch (e) {
    return err(e, 'Failed to load revision history');
  }
}

export type RecordRevisionInput = {
  quoteId: string;
  handymanId: string;
  reason: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousTotal?: number | null;
  newTotal?: number | null;
  /** State *before* the change (preferred). */
  snapshot: QuoteRevisionSnapshot;
  note?: string | null;
};

export async function recordRevision(
  input: RecordRevisionInput,
): Promise<Result<QuoteRevision>> {
  try {
    const {data: last} = await supabase
      .from('quote_revisions')
      .select('revision_number')
      .eq('quote_id', input.quoteId)
      .order('revision_number', {ascending: false})
      .limit(1)
      .maybeSingle();

    const nextNum = (last?.revision_number ?? 0) + 1;

    const {data, error} = await supabase
      .from('quote_revisions')
      .insert({
        quote_id: input.quoteId,
        handyman_id: input.handymanId,
        revision_number: nextNum,
        reason: input.reason,
        previous_status: input.previousStatus ?? null,
        new_status: input.newStatus ?? null,
        previous_total: input.previousTotal ?? null,
        new_total: input.newTotal ?? null,
        snapshot: input.snapshot,
        note: input.note ?? null,
      })
      .select()
      .single();

    if (error) return err(error);
    return ok(mapRevisionRow(data));
  } catch (e) {
    return err(e, 'Failed to record revision');
  }
}
