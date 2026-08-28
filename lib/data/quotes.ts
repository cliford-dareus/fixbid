import {supabase} from '@/lib/supabase';
import {mapQuoteRow, quoteUpdatesToDb} from './mappers';
import {recordRevision, snapshotFromQuote} from './revisions';
import {err, ok} from './result';
import type {CreateQuoteInput, Quote} from './types';

const QUOTE_SELECT = `
  id,
  client_id,
  client_name,
  client_phone,
  template_id,
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
  acceptance_mode,
  accepted_at,
  accepted_by_name,
  quote_line_items (
    id,
    description,
    quantity,
    unit_price,
    is_labor,
    photo_url
  )
`;

export async function listQuotes(handymanId: string): Promise<import('./types').Result<Quote[]>> {
  try {
    const {data, error} = await supabase
      .from('quotes')
      .select(QUOTE_SELECT)
      .eq('handyman_id', handymanId)
      .order('created_at', {ascending: false});
    if (error) return err(error.message);
    return ok((data || []).map(mapQuoteRow));
  } catch (e: any) {
    return err(e?.message || 'Failed to list quotes');
  }
}

export async function getQuote(id: string): Promise<import('./types').Result<Quote>> {
  try {
    const {data, error} = await supabase.from('quotes').select(QUOTE_SELECT).eq('id', id).maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('Quote not found');
    return ok(mapQuoteRow(data));
  } catch (e: any) {
    return err(e?.message || 'Failed to load quote');
  }
}

export async function createQuote(input: CreateQuoteInput): Promise<import('./types').Result<Quote>> {
  try {
    const status = input.status ?? 'draft';
    const deposit =
      input.deposit_percent != null && input.deposit_percent > 0
        ? input.deposit_percent
        : null;
    let validUntil = input.valid_until ?? null;
    if (status === 'sent' && !validUntil) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      validUntil = d.toISOString().slice(0, 10);
    }
    const {data: quote, error} = await supabase
      .from('quotes')
      .insert({
        handyman_id: input.handyman_id,
        client_id: input.client_id ?? null,
        client_name: input.client_name,
        client_phone: input.client_phone ?? null,
        template_id: input.template_id ?? null,
        job_name: input.job_name,
        notes: input.notes ?? null,
        total_amount: input.total_amount,
        status,
        photos: input.photos ?? [],
        inclusions: input.inclusions ?? null,
        exclusions: input.exclusions ?? null,
        warranty_text: input.warranty_text ?? null,
        deposit_percent: deposit,
        acceptance_mode: input.acceptance_mode === 'accept' ? 'accept' : 'deposit',
        valid_until: validUntil,
      })
      .select('id')
      .single();
    if (error) return err(error.message);
    if (input.line_items?.length) {
      const rows = input.line_items.map((li) => ({
        quote_id: quote.id,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unitPrice,
        is_labor: li.isLabor,
        photo_url: li.photo_url ?? li.photoUri ?? null,
      }));
      const {error: liErr} = await supabase.from('quote_line_items').insert(rows);
      if (liErr) return err(liErr.message);
    }
    return getQuote(quote.id);
  } catch (e: any) {
    return err(e?.message || 'Failed to create quote');
  }
}

export async function updateQuote(
  id: string,
  updates: Partial<Quote>,
): Promise<import('./types').Result<Quote>> {
  try {
    const patch = quoteUpdatesToDb(updates);
    if (updates.status === 'sent' && updates.valid_until === undefined) {
      if (patch.valid_until === undefined) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        patch.valid_until = d.toISOString().slice(0, 10);
      }
    }
    if (Object.keys(patch).length) {
      const {error} = await supabase.from('quotes').update(patch).eq('id', id);
      if (error) return err(error.message);
    }
    return getQuote(id);
  } catch (e: any) {
    return err(e?.message || 'Failed to update quote');
  }
}

export async function replaceLineItems(
  quoteId: string,
  items: import('./types').LineItem[],
  totalAmount: number,
  newStatus: import('./types').QuoteStatus,
  note?: string,
): Promise<import('./types').Result<Quote>> {
  try {
    const before = await getQuote(quoteId);
    if (!before.ok) return before;
    const prev = before.data;
    await recordRevision({
      quoteId,
      previousStatus: prev.status,
      newStatus,
      previousTotal: prev.total_amount,
      newTotal: totalAmount,
      snapshot: snapshotFromQuote(prev),
      note,
    });
    await supabase.from('quote_line_items').delete().eq('quote_id', quoteId);
    if (items.length) {
      const rows = items.map((li) => ({
        quote_id: quoteId,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unitPrice,
        is_labor: li.isLabor,
        photo_url: li.photo_url ?? li.photoUri ?? null,
      }));
      const {error: liErr} = await supabase.from('quote_line_items').insert(rows);
      if (liErr) return err(liErr.message);
    }
    const {error} = await supabase
      .from('quotes')
      .update({
        total_amount: totalAmount,
        status: newStatus,
      })
      .eq('id', quoteId);
    if (error) return err(error.message);
    return getQuote(quoteId);
  } catch (e: any) {
    return err(e?.message || 'Failed to replace line items');
  }
}

export async function deleteQuote(id: string): Promise<import('./types').Result<void>> {
  try {
    const {error} = await supabase.from('quotes').delete().eq('id', id);
    if (error) return err(error.message);
    return ok(undefined);
  } catch (e: any) {
    return err(e?.message || 'Failed to delete quote');
  }
}
