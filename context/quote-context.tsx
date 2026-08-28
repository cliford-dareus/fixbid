/**
 * Compatibility facade over domain providers (B2).
 *
 * Prefer:
 *   useQuotes()  · useClients()  · useJobs()
 *
 * useQuote() still works for existing screens — it merges the three contexts.
 */
import React, {ReactNode, useCallback, useMemo, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/context/auth-context';
import {ClientsProvider, useClients} from '@/context/clients-context';
import {JobsProvider, useJobs} from '@/context/jobs-context';
import {QuotesProvider, useQuotes} from '@/context/quotes-context';
import {queryKeys} from '@/lib/query-client';
import type {Client, DraftLineItem, Job, LineItem, Payment, Quote} from '@/lib/data';

export type {Client, DraftLineItem, Job, LineItem, Payment, Quote};
export {useClients} from '@/context/clients-context';
export {useJobs} from '@/context/jobs-context';
export {useQuotes} from '@/context/quotes-context';

/** Nest domain providers. Order does not matter (no cross-deps). */
export function QuoteProvider({children}: {children: ReactNode}) {
  return (
    <ClientsProvider>
      <JobsProvider>
        <QuotesProvider>{children}</QuotesProvider>
      </JobsProvider>
    </ClientsProvider>
  );
}

/**
 * Legacy combined hook — same shape as pre-B2 QuoteContext.
 * New code should call useQuotes / useClients / useJobs instead.
 */
export function useQuote() {
  const {user} = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();

  const quotes = useQuotes();
  const clients = useClients();
  const jobs = useJobs();

  const [loadingOverride, setLoading] = useState(false);

  const refreshAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await Promise.all([
        qc.invalidateQueries({queryKey: queryKeys.quotes(userId)}),
        qc.invalidateQueries({queryKey: queryKeys.clients(userId)}),
        qc.invalidateQueries({queryKey: queryKeys.jobs(userId)}),
      ]);
    } finally {
      setLoading(false);
    }
  }, [qc, userId]);

  const loading =
    loadingOverride || quotes.loading || clients.loading || jobs.loading;

  return useMemo(
    () => ({
      quotes: quotes.quotes,
      newQuote: quotes.newQuote,
      addNewQuote: quotes.addNewQuote,
      updateNewQuote: quotes.updateNewQuote,
      clearNewQuote: quotes.clearNewQuote,
      updateQuote: quotes.updateQuote,
      deleteQuote: quotes.deleteQuote,

      lineItems: quotes.lineItems,
      updateLineItem: quotes.updateLineItem,
      removeLineItem: quotes.removeLineItem,
      addLineItem: quotes.addLineItem,
      setLineItems: quotes.setLineItems,

      clients: clients.clients,
      addClient: clients.addClient,
      updateClient: clients.updateClient,
      deleteClient: clients.deleteClient,

      jobs: jobs.jobs,
      updateJob: jobs.updateJob,
      getTodayJobs: jobs.getTodayJobs,
      getMonthRevenue: jobs.getMonthRevenue,

      fetchClients: clients.fetchClients,
      fetchQuotes: quotes.fetchQuotes,
      fetchJobs: jobs.fetchJobs,
      refreshAll,

      loading,
      setLoading,
    }),
    [quotes, clients, jobs, refreshAll, loading],
  );
}
