import type {RealtimeChannel} from '@supabase/supabase-js';
import {supabase} from '@/lib/supabase';
import type {Quote} from '@/lib/data';

const NOTIFY_STATUSES = new Set([
  'declined',
  'deposit_paid',
  'accepted',
  'approved',
  'paid',
]);

export type QuoteStatusChange = {
  id: string;
  status: string;
  prevStatus: string;
  job_name?: string;
  client_name?: string;
  total_amount?: number;
  /** Full patch from Realtime `new` row (partial). */
  patch: Partial<Quote> & {id: string};
  shouldNotify: boolean;
};

export function quoteStatusMessage(row: {
  status?: string;
  job_name?: string;
  client_name?: string;
  total_amount?: number;
}): {title: string; body: string} | null {
  const status = (row.status || '').toLowerCase();
  if (!NOTIFY_STATUSES.has(status)) return null;

  const job = row.job_name?.trim() || 'Quote';
  const client = row.client_name?.trim() || 'Client';
  const amount =
    row.total_amount != null
      ? `$${Number(row.total_amount).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}`
      : '';

  if (status === 'declined') {
    return {
      title: 'Quote declined',
      body: `${client} declined “${job}”${amount ? ` (${amount})` : ''}.`,
    };
  }

  if (status === 'deposit_paid' || status === 'paid') {
    return {
      title: status === 'paid' ? 'Quote paid' : 'Deposit received',
      body: `${client} paid on “${job}”${amount ? ` · ${amount}` : ''}.`,
    };
  }

  return {
    title: 'Quote accepted',
    body: `${client} accepted “${job}”${amount ? ` · ${amount}` : ''}.`,
  };
}

/**
 * Subscribe to quote UPDATEs for one handyman.
 * Callers apply `patch` to local cache and optionally notify.
 */
export function subscribeHandymanQuoteUpdates(
  handymanId: string,
  onChange: (change: QuoteStatusChange) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`quotes-handyman-${handymanId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'quotes',
        filter: `handyman_id=eq.${handymanId}`,
      },
      (payload) => {
        const next = payload.new as Partial<Quote> & {id?: string; status?: string};
        const prev = payload.old as Partial<Quote> | undefined;
        if (!next?.id) return;

        const nextStatus = (next.status || '').toLowerCase();
        const prevStatus = (prev?.status || '').toLowerCase();

        onChange({
          id: next.id,
          status: nextStatus,
          prevStatus,
          job_name: next.job_name,
          client_name: next.client_name,
          total_amount: next.total_amount != null ? Number(next.total_amount) : undefined,
          patch: next as Partial<Quote> & {id: string},
          shouldNotify:
            prevStatus !== nextStatus && NOTIFY_STATUSES.has(nextStatus),
        });
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn(
          'Quotes realtime channel error — is Realtime enabled on public.quotes?',
        );
      }
    });

  return channel;
}

export function unsubscribeChannel(channel: RealtimeChannel | null | undefined) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
