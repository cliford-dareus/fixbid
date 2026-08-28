/**
 * Compatibility facade over domain providers.
 *
 * Prefer: useQuotes() · useClients() · useJobs()
 * Draft builder: useNewQuoteDraft() in app/quote/new only.
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

export function QuoteProvider({children}: {children: ReactNode}) {
  return (
    <ClientsProvider>
      <JobsProvider>
        <QuotesProvider>{children}</QuotesProvider>
      </JobsProvider>
    </ClientsProvider>
  );
}

/** Combined list API for existing screens (no draft fields). */
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
      updateQuote: quotes.updateQuote,
      deleteQuote: quotes.deleteQuote,
      fetchQuotes: quotes.fetchQuotes,

      clients: clients.clients,
      addClient: clients.addClient,
      updateClient: clients.updateClient,
      deleteClient: clients.deleteClient,
      fetchClients: clients.fetchClients,

      jobs: jobs.jobs,
      updateJob: jobs.updateJob,
      getTodayJobs: jobs.getTodayJobs,
      getMonthRevenue: jobs.getMonthRevenue,
      fetchJobs: jobs.fetchJobs,

      refreshAll,
      loading,
      setLoading,
    }),
    [quotes, clients, jobs, refreshAll, loading],
  );
}
