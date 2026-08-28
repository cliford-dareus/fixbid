import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {Alert} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/context/auth-context';
import {quotesApi, type Quote} from '@/lib/data';
import {notifyLocal} from '@/lib/notification';
import {fromResult, queryKeys} from '@/lib/query-client';
import {
  quoteStatusMessage,
  subscribeHandymanQuoteUpdates,
  unsubscribeChannel,
} from '@/lib/realtime';

type QuotesContextType = {
  quotes: Quote[];
  loading: boolean;
  updateQuote: (id: string, updates: Partial<Quote>) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  fetchQuotes: () => Promise<void>;
};

const QuotesContext = createContext<QuotesContextType | undefined>(undefined);

export function QuotesProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const notifiedRef = useRef<Set<string>>(new Set());

  const quotesQuery = useQuery({
    queryKey: userId ? queryKeys.quotes(userId) : ['quotes', 'none'],
    queryFn: () => fromResult(quotesApi.listQuotes(userId!)),
    enabled: Boolean(userId),
  });

  const quotes = quotesQuery.data ?? [];

  useEffect(() => {
    if (quotesQuery.error) console.error(quotesQuery.error);
  }, [quotesQuery.error]);

  useEffect(() => {
    if (!userId) notifiedRef.current.clear();
  }, [userId]);

  const fetchQuotes = useCallback(async () => {
    if (!userId) return;
    await qc.invalidateQueries({queryKey: queryKeys.quotes(userId)});
  }, [qc, userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = subscribeHandymanQuoteUpdates(userId, (change) => {
      qc.setQueryData<Quote[]>(queryKeys.quotes(userId), (list) => {
        if (!list) {
          void qc.invalidateQueries({queryKey: queryKeys.quotes(userId)});
          return list;
        }
        const idx = list.findIndex((q) => q.id === change.id);
        if (idx === -1) {
          void qc.invalidateQueries({queryKey: queryKeys.quotes(userId)});
          return list;
        }
        const copy = list.slice();
        copy[idx] = {...list[idx], ...change.patch} as Quote;
        return copy;
      });

      if (!change.shouldNotify) return;

      const dedupeKey = `${change.id}:${change.status}`;
      if (notifiedRef.current.has(dedupeKey)) return;
      notifiedRef.current.add(dedupeKey);

      const msg = quoteStatusMessage({
        status: change.status,
        job_name: change.job_name,
        client_name: change.client_name,
        total_amount: change.total_amount,
      });
      if (!msg) return;

      notifyLocal(msg.title, msg.body, {
        quoteId: change.id,
        status: change.status,
      }).catch(() => {});

      Alert.alert(msg.title, msg.body);

      if (['deposit_paid', 'accepted', 'approved', 'paid'].includes(change.status)) {
        void qc.invalidateQueries({queryKey: queryKeys.jobs(userId)});
      }
    });

    return () => unsubscribeChannel(channel);
  }, [userId, qc]);

  const updateQuoteMutation = useMutation({
    mutationFn: ({id, updates}: {id: string; updates: Partial<Quote>}) =>
      fromResult(quotesApi.updateQuote(id, updates)),
    onMutate: async ({id, updates}) => {
      if (!userId) return;
      await qc.cancelQueries({queryKey: queryKeys.quotes(userId)});
      const prev = qc.getQueryData<Quote[]>(queryKeys.quotes(userId));
      qc.setQueryData<Quote[]>(queryKeys.quotes(userId), (list) =>
        (list ?? []).map((q) => (q.id === id ? {...q, ...updates} : q)),
      );
      return {prev};
    },
    onError: (err, _vars, ctx) => {
      if (userId && ctx?.prev) {
        qc.setQueryData(queryKeys.quotes(userId), ctx.prev);
      }
      console.error(err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update quote');
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (id: string) => fromResult(quotesApi.deleteQuote(id)),
    onMutate: async (id) => {
      if (!userId) return;
      await qc.cancelQueries({queryKey: queryKeys.quotes(userId)});
      const prev = qc.getQueryData<Quote[]>(queryKeys.quotes(userId));
      qc.setQueryData<Quote[]>(queryKeys.quotes(userId), (list) =>
        (list ?? []).filter((q) => q.id !== id),
      );
      return {prev};
    },
    onError: (err, _id, ctx) => {
      if (userId && ctx?.prev) {
        qc.setQueryData(queryKeys.quotes(userId), ctx.prev);
      }
      console.error(err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete quote');
    },
  });

  const updateQuote = useCallback(
    async (id: string, updates: Partial<Quote>) => {
      if (!id) return;
      await updateQuoteMutation.mutateAsync({id, updates});
    },
    [updateQuoteMutation],
  );

  const deleteQuote = useCallback(
    async (id: string) => {
      if (!id) return;
      await deleteQuoteMutation.mutateAsync(id);
    },
    [deleteQuoteMutation],
  );

  const value = useMemo(
    () => ({
      quotes,
      loading: Boolean(userId) && quotesQuery.isLoading,
      updateQuote,
      deleteQuote,
      fetchQuotes,
    }),
    [quotes, userId, quotesQuery.isLoading, updateQuote, deleteQuote, fetchQuotes],
  );

  return (
    <QuotesContext.Provider value={value}>{children}</QuotesContext.Provider>
  );
}

export function useQuotes() {
  const ctx = useContext(QuotesContext);
  if (!ctx) throw new Error('useQuotes must be used within QuotesProvider');
  return ctx;
}
