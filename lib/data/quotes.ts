import {supabase} from '@/lib/supabase';
import {mapQuoteRow, quoteUpdatesToDb} from './mappers';
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
  quote_line_items (
    id,
    description,
    quantity,
    unit_price,
    is_labor,
    photo_url
  )
`;

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
        status: input.status ?? 'draft',
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
    if (Object.keys(dbUpdates).length === 0) return ok(undefined);

    const {error} = await supabase.from('quotes').update(dbUpdates).eq('id', id);
    if (error) return err(error);
    return ok(undefined);
  } catch (e) {
    return err(e, 'Failed to update quote');
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
