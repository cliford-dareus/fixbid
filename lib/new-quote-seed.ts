import type {DraftLineItem} from '@/lib/data';

/**
 * One-shot handoff when navigating Template Detail → New Quote.
 * Not global React state — consumed once when the new-quote screen mounts.
 */
export type NewQuoteSeed = {
  jobName?: string;
  clientId?: string | null;
  clientName?: string;
  clientPhone?: string;
  notes?: string;
  lineItems?: DraftLineItem[];
  totalAmount?: number;
};

let seed: NewQuoteSeed | null = null;

export function setNewQuoteSeed(next: NewQuoteSeed | null) {
  seed = next;
}

/** Read and clear. */
export function consumeNewQuoteSeed(): NewQuoteSeed | null {
  const current = seed;
  seed = null;
  return current;
}
