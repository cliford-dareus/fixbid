import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Alert} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/context/auth-context';
import {notifyLocal} from '@/lib/notification';
import {fromResult, queryKeys} from '@/lib/query-client';
import {
  quoteStatusMessage,
  subscribeHandymanQuoteUpdates,
  unsubscribeChannel,
} from '@/lib/realtime';
import {
  clientsApi,
  jobsApi,
  quotesApi,
  type Client,
  type CreateClientInput,
  type DraftLineItem,
  type Job,
  type LineItem,
  type Payment,
  type Quote,
} from '@/lib/data';

export type {Client, DraftLineItem, Job, LineItem, Payment, Quote};

type QuoteContextType = {
  quotes: Quote[];
  newQuote: Quote | null;
  addNewQuote: (q: Partial<Quote>) => Quote;
  updateNewQuote: (field: string, value: string | number) => void;
  clearNewQuote: () => void;

  updateQuote: (id: string, updates: Partial<Quote>) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;

  lineItems: DraftLineItem[];
  updateLineItem: (idx: number, field: keyof DraftLineItem, value: string | number) => void;
  removeLineItem: (idx: number) => void;
  addLineItem: () => void;
  setLineItems: React.Dispatch<React.SetStateAction<DraftLineItem[]>>;

  clients: Client[];
  addClient: (input: CreateClientInput) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  jobs: Job[];
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  getTodayJobs: () => Job[];
  getMonthRevenue: (month?: number, year?: number) => number;

  fetchClients: () => Promise<void>;
  fetchQuotes: () => Promise<void>;
  fetchJobs: () => Promise<void>;
  refreshAll: () => Promise<void>;

  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();

  const [newQuote, setNewQuote] = useState<Quote | null>(null);
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);
  const [loadingOverride, setLoading] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  // ── Queries ──────────────────────────────────────────────────────────────

  const quotesQuery = useQuery({
    queryKey: userId ? queryKeys.quotes(userId) : ['quotes', 'none'],
    queryFn: () => fromResult(quotesApi.listQuotes(userId!)),
    enabled: Boolean(userId),
  });

  const clientsQuery = useQuery({
    queryKey: userId ? queryKeys.clients(userId) : ['clients', 'none'],
    queryFn: () => fromResult(clientsApi.listClients(userId!)),
    enabled: Boolean(userId),
  });

  const jobsQuery = useQuery({
    queryKey: userId ? queryKeys.jobs(userId) : ['jobs', 'none'],
    queryFn: () => fromResult(jobsApi.listJobs(userId!)),
    enabled: Boolean(userId),
  });

  const quotes = quotesQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];

  const loading =
    loadingOverride ||
    (Boolean(userId) &&
      (quotesQuery.isLoading || clientsQuery.isLoading || jobsQuery.isLoading));

  useEffect(() => {
    if (!userId) {
      notifiedRef.current.clear();
    }
  }, [userId]);

  // Surface query errors once
  useEffect(() => {
    const err =
      quotesQuery.error || clientsQuery.error || jobsQuery.error;
    if (err) {
      console.error(err);
    }
  }, [quotesQuery.error, clientsQuery.error, jobsQuery.error]);

  const fetchQuotes = useCallback(async () => {
    if (!userId) return;
    await qc.invalidateQueries({queryKey: queryKeys.quotes(userId)});
  }, [qc, userId]);

  const fetchClients = useCallback(async () => {
    if (!userId) return;
    await qc.invalidateQueries({queryKey: queryKeys.clients(userId)});
  }, [qc, userId]);

  const fetchJobs = useCallback(async () => {
    if (!userId) return;
    await qc.invalidateQueries({queryKey: queryKeys.jobs(userId)});
  }, [qc, userId]);

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

  // ── Realtime → query cache ───────────────────────────────────────────────

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

  // ── Draft (UI-only) ──────────────────────────────────────────────────────

  const addNewQuote = useCallback((q: Partial<Quote>): Quote => {
    const draft: Quote = {
      id: '',
      client_id: q.client_id ?? null,
      client_name: q.client_name ?? '',
      job_name: q.job_name ?? '',
      quote_line_items: q.quote_line_items ?? [],
      notes: q.notes ?? '',
      total_amount: q.total_amount ?? 0,
      status: q.status ?? 'draft',
      created_at: new Date().toISOString(),
      photos: q.photos ?? [],
      ...q,
    };
    setNewQuote(draft);
    return draft;
  }, []);

  const updateNewQuote = useCallback((field: string, value: string | number) => {
    setNewQuote((prev) => (prev ? {...prev, [field]: value} : prev));
  }, []);

  const clearNewQuote = useCallback(() => {
    setLineItems([]);
    setNewQuote(null);
  }, []);

  // ── Mutations ────────────────────────────────────────────────────────────

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

  const updateLineItem = useCallback(
    (idx: number, field: keyof DraftLineItem, value: string | number) => {
      setLineItems((prev) =>
        prev.map((li, i) => (i === idx ? {...li, [field]: value} : li)),
      );
    },
    [],
  );

  const removeLineItem = useCallback((idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {description: '', quantity: 1, unitPrice: 0, isLabor: true},
    ]);
  }, []);

  const addClient = useCallback(
    async (input: CreateClientInput): Promise<Client> => {
      if (!userId) throw new Error('Not logged in');
      const created = await fromResult(clientsApi.createClient(userId, input));
      qc.setQueryData<Client[]>(queryKeys.clients(userId), (list) => [
        created,
        ...(list ?? []),
      ]);
      return created;
    },
    [qc, userId],
  );

  const updateClient = useCallback(
    async (id: string, updates: Partial<Client>) => {
      if (!id || !userId) return;
      const prev = qc.getQueryData<Client[]>(queryKeys.clients(userId));
      qc.setQueryData<Client[]>(queryKeys.clients(userId), (list) =>
        (list ?? []).map((c) => (c.id === id ? {...c, ...updates} : c)),
      );
      try {
        await fromResult(clientsApi.updateClient(id, updates));
      } catch (e) {
        if (prev) qc.setQueryData(queryKeys.clients(userId), prev);
        console.error(e);
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update client');
        throw e;
      }
    },
    [qc, userId],
  );

  const deleteClient = useCallback(
    async (id: string) => {
      if (!id || !userId) return;
      const prev = qc.getQueryData<Client[]>(queryKeys.clients(userId));
      qc.setQueryData<Client[]>(queryKeys.clients(userId), (list) =>
        (list ?? []).filter((c) => c.id !== id),
      );
      try {
        await fromResult(clientsApi.deleteClient(id));
      } catch (e) {
        if (prev) qc.setQueryData(queryKeys.clients(userId), prev);
        console.error(e);
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete client');
        throw e;
      }
    },
    [qc, userId],
  );

  const updateJob = useCallback(
    async (id: string, updates: Partial<Job>) => {
      if (!id || !userId) return;
      const prev = qc.getQueryData<Job[]>(queryKeys.jobs(userId));
      qc.setQueryData<Job[]>(queryKeys.jobs(userId), (list) =>
        (list ?? []).map((j) => (j.id === id ? {...j, ...updates} : j)),
      );
      try {
        await fromResult(jobsApi.updateJob(id, updates));
      } catch (e) {
        if (prev) qc.setQueryData(queryKeys.jobs(userId), prev);
        console.error(e);
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update job');
        throw e;
      }
    },
    [qc, userId],
  );

  const getTodayJobs = useCallback(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
    );

    return jobs.filter((job) => {
      if (!job.schedule_date) return false;
      const jobDate = new Date(job.schedule_date);
      return jobDate >= startOfDay && jobDate <= endOfDay;
    });
  }, [jobs]);

  const getMonthRevenue = useCallback(
    (month?: number, year?: number) => {
      const now = new Date();
      const m = month ?? now.getMonth();
      const y = year ?? now.getFullYear();

      return jobs
        .filter((job) => {
          const d = new Date(job.created_at);
          return d.getMonth() === m && d.getFullYear() === y;
        })
        .reduce((acc, job) => {
          const paid = (job.payments || []).reduce(
            (s, payment) => s + (Number(payment.amount) || 0),
            0,
          );
          if (paid > 0) return acc + paid;
          if (job.status === 'paid' || job.status === 'completed') {
            return acc + (Number(job.total_amount) || 0);
          }
          return acc;
        }, 0);
    },
    [jobs],
  );

  const value = useMemo(
    () => ({
      newQuote,
      addNewQuote,
      updateNewQuote,
      clearNewQuote,
      quotes,
      updateQuote,
      deleteQuote,

      lineItems,
      updateLineItem,
      removeLineItem,
      addLineItem,
      setLineItems,

      clients,
      addClient,
      updateClient,
      deleteClient,

      jobs,
      updateJob,
      getTodayJobs,
      getMonthRevenue,

      fetchClients,
      fetchQuotes,
      fetchJobs,
      refreshAll,

      loading,
      setLoading,
    }),
    [
      newQuote,
      addNewQuote,
      updateNewQuote,
      clearNewQuote,
      quotes,
      updateQuote,
      deleteQuote,
      lineItems,
      updateLineItem,
      removeLineItem,
      addLineItem,
      clients,
      addClient,
      updateClient,
      deleteClient,
      jobs,
      updateJob,
      getTodayJobs,
      getMonthRevenue,
      fetchClients,
      fetchQuotes,
      fetchJobs,
      refreshAll,
      loading,
    ],
  );

  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
}

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error('useQuote must be used within a QuoteProvider');
  }
  return context;
};
