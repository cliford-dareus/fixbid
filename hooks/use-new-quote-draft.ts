import {useCallback, useMemo, useState} from 'react';
import type {DraftLineItem, Quote} from '@/lib/data';
import {consumeNewQuoteSeed, type NewQuoteSeed} from '@/lib/new-quote-seed';

export type NewQuoteDraft = {
  jobName: string;
  notes: string;
  selectedClientId: string | null;
  clientName: string;
  clientPhone: string;
  photos: string[];
  lineItems: DraftLineItem[];
  /** Lightweight mirror of former newQuote.job_name etc. */
  meta: Partial<Quote> | null;
};

function emptyDraft(): NewQuoteDraft {
  return {
    jobName: '',
    notes: '',
    selectedClientId: null,
    clientName: '',
    clientPhone: '',
    photos: [],
    lineItems: [],
    meta: null,
  };
}

function fromSeed(seed: NewQuoteSeed | null): NewQuoteDraft {
  if (!seed) return emptyDraft();
  return {
    jobName: seed.jobName ?? '',
    notes: seed.notes ?? '',
    selectedClientId: seed.clientId ?? null,
    clientName: seed.clientName ?? '',
    clientPhone: seed.clientPhone ?? '',
    photos: [],
    lineItems: seed.lineItems ?? [],
    meta: seed.jobName
      ? {
          job_name: seed.jobName,
          client_id: seed.clientId ?? null,
          client_name: seed.clientName ?? '',
          notes: seed.notes ?? '',
          total_amount: seed.totalAmount ?? 0,
          status: 'draft',
        }
      : null,
  };
}

/**
 * Screen-local draft for /quote/new.
 * Does not live in QuotesProvider — typing line items won't re-render the dashboard.
 */
export function useNewQuoteDraft() {
  const [draft, setDraft] = useState<NewQuoteDraft>(() => fromSeed(consumeNewQuoteSeed()));

  const setJobName = useCallback((jobName: string) => {
    setDraft((d) => ({
      ...d,
      jobName,
      meta: d.meta ? {...d.meta, job_name: jobName} : d.meta,
    }));
  }, []);

  const setNotes = useCallback((notes: string) => {
    setDraft((d) => ({...d, notes}));
  }, []);

  const setSelectedClientId = useCallback((selectedClientId: string | null) => {
    setDraft((d) => ({...d, selectedClientId}));
  }, []);

  const setClientName = useCallback((clientName: string) => {
    setDraft((d) => ({...d, clientName}));
  }, []);

  const setClientPhone = useCallback((clientPhone: string) => {
    setDraft((d) => ({...d, clientPhone}));
  }, []);

  const setPhotos = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      setDraft((d) => ({
        ...d,
        photos: typeof updater === 'function' ? updater(d.photos) : updater,
      }));
    },
    [],
  );

  const setLineItems = useCallback(
    (updater: DraftLineItem[] | ((prev: DraftLineItem[]) => DraftLineItem[])) => {
      setDraft((d) => ({
        ...d,
        lineItems: typeof updater === 'function' ? updater(d.lineItems) : updater,
      }));
    },
    [],
  );

  const updateLineItem = useCallback(
    (idx: number, field: keyof DraftLineItem, value: string | number) => {
      setDraft((d) => ({
        ...d,
        lineItems: d.lineItems.map((li, i) =>
          i === idx ? {...li, [field]: value} : li,
        ),
      }));
    },
    [],
  );

  const removeLineItem = useCallback((idx: number) => {
    setDraft((d) => ({
      ...d,
      lineItems: d.lineItems.filter((_, i) => i !== idx),
    }));
  }, []);

  const addLineItem = useCallback(() => {
    setDraft((d) => ({
      ...d,
      lineItems: [
        ...d.lineItems,
        {description: '', quantity: 1, unitPrice: 0, isLabor: true},
      ],
    }));
  }, []);

  /** Apply a template-style payload (also used after photo suggest). */
  const applyTemplateDraft = useCallback(
    (partial: {
      jobName: string;
      lineItems: DraftLineItem[];
      totalAmount?: number;
      notes?: string;
    }) => {
      setDraft((d) => ({
        ...d,
        jobName: partial.jobName,
        lineItems: partial.lineItems,
        notes: partial.notes ?? d.notes,
        meta: {
          job_name: partial.jobName,
          total_amount: partial.totalAmount ?? 0,
          status: 'draft',
          client_id: d.selectedClientId,
          client_name: d.clientName,
        },
      }));
    },
    [],
  );

  const reset = useCallback(() => {
    setDraft(emptyDraft());
  }, []);

  const total = useMemo(
    () =>
      draft.lineItems.reduce(
        (sum, item) => sum + (item?.quantity || 0) * (item?.unitPrice || 0),
        0,
      ),
    [draft.lineItems],
  );

  return {
    ...draft,
    total,
    setJobName,
    setNotes,
    setSelectedClientId,
    setClientName,
    setClientPhone,
    setPhotos,
    setLineItems,
    updateLineItem,
    removeLineItem,
    addLineItem,
    applyTemplateDraft,
    reset,
  };
}
