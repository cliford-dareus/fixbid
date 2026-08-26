import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {Alert} from 'react-native';
import {useAuth} from '@/context/auth-context';
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

// Re-export domain types so existing `import { Quote } from '@/context/quote-context'` keeps working
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
  const [newQuote, setNewQuote] = useState<Quote | null>(null);
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const fetchClients = useCallback(async () => {
    if (!user?.id) return;
    const result = await clientsApi.listClients(user.id);
    if (!result.ok) {
      console.error(result.error);
      Alert.alert('Error', result.error || 'Failed to load clients.');
      return;
    }
    setClients(result.data);
  }, [user?.id]);

  const fetchJobs = useCallback(async () => {
    if (!user?.id) return;
    const result = await jobsApi.listJobs(user.id);
    if (!result.ok) {
      console.error(result.error);
      Alert.alert('Error', result.error || 'Failed to load jobs.');
      return;
    }
    setJobs(result.data);
  }, [user?.id]);

  const fetchQuotes = useCallback(async () => {
    if (!user?.id) return;
    const result = await quotesApi.listQuotes(user.id);
    if (!result.ok) {
      console.error(result.error);
      Alert.alert('Error', result.error || 'Failed to load quotes.');
      return;
    }
    setQuotes(result.data);
  }, [user?.id]);

  const refreshAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await Promise.all([fetchClients(), fetchQuotes(), fetchJobs()]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchClients, fetchQuotes, fetchJobs]);

  useEffect(() => {
    if (!user?.id) {
      setClients([]);
      setQuotes([]);
      setJobs([]);
      return;
    }
    refreshAll();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draft quote builder (UI-only) ────────────────────────────────────────

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

  // ── Quotes ───────────────────────────────────────────────────────────────

  const updateQuote = useCallback(
    async (id: string, updates: Partial<Quote>) => {
      if (!id) return;

      const prev = quotes;
      setQuotes((list) => list.map((q) => (q.id === id ? {...q, ...updates} : q)));

      const result = await quotesApi.updateQuote(id, updates);
      if (!result.ok) {
        setQuotes(prev);
        console.error(result.error);
        Alert.alert('Error', result.error || 'Failed to update quote');
        throw new Error(result.error);
      }
    },
    [quotes],
  );

  const deleteQuote = useCallback(
    async (id: string) => {
      if (!id) return;

      const prev = quotes;
      setQuotes((list) => list.filter((q) => q.id !== id));

      const result = await quotesApi.deleteQuote(id);
      if (!result.ok) {
        setQuotes(prev);
        console.error(result.error);
        Alert.alert('Error', result.error || 'Failed to delete quote');
        throw new Error(result.error);
      }
    },
    [quotes],
  );

  // ── Draft line items (UI-only) ───────────────────────────────────────────

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

  // ── Clients ──────────────────────────────────────────────────────────────

  const addClient = useCallback(
    async (input: CreateClientInput): Promise<Client> => {
      if (!user?.id) throw new Error('Not logged in');

      const result = await clientsApi.createClient(user.id, input);
      if (!result.ok) throw new Error(result.error);

      setClients((prev) => [result.data, ...prev]);
      return result.data;
    },
    [user?.id],
  );

  const updateClient = useCallback(
    async (id: string, updates: Partial<Client>) => {
      if (!id) return;

      const prev = clients;
      setClients((list) => list.map((c) => (c.id === id ? {...c, ...updates} : c)));

      const result = await clientsApi.updateClient(id, updates);
      if (!result.ok) {
        setClients(prev);
        console.error(result.error);
        Alert.alert('Error', result.error || 'Failed to update client');
        throw new Error(result.error);
      }
    },
    [clients],
  );

  const deleteClient = useCallback(
    async (id: string) => {
      if (!id) return;

      const prev = clients;
      setClients((list) => list.filter((c) => c.id !== id));

      const result = await clientsApi.deleteClient(id);
      if (!result.ok) {
        setClients(prev);
        console.error(result.error);
        Alert.alert('Error', result.error || 'Failed to delete client');
        throw new Error(result.error);
      }
    },
    [clients],
  );

  // ── Jobs ─────────────────────────────────────────────────────────────────

  const updateJob = useCallback(
    async (id: string, updates: Partial<Job>) => {
      if (!id) return;

      const prev = jobs;
      setJobs((list) => list.map((j) => (j.id === id ? {...j, ...updates} : j)));

      const result = await jobsApi.updateJob(id, updates);
      if (!result.ok) {
        setJobs(prev);
        console.error(result.error);
        Alert.alert('Error', result.error || 'Failed to update job');
        throw new Error(result.error);
      }
    },
    [jobs],
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

  return (
    <QuoteContext.Provider
      value={{
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
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error('useQuote must be used within a QuoteProvider');
  }
  return context;
};
