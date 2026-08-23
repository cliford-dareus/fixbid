import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import {useAuth} from '@/context/auth-context';
import {supabase} from '@/lib/supabase';
import {Alert} from 'react-native';

export interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    isLabor: boolean;
    photoUri?: string;
    photo_url?: string;
}

export interface Client {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    created_at?: string;
    createdAt?: string;
    handyman_id?: string;
}

/** Draft line item used while building a new quote (no id required). */
export interface DraftLineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    isLabor: boolean;
    photoUri?: string;
}

export interface Quote {
    id: string;
    client_id: string | null;
    client_name: string;
    client_phone?: string | null;
    template_id?: string;
    job_name: string;
    quote_line_items: LineItem[];
    notes: string;
    total_amount: number;
    status: 'draft' | 'sent' | 'accepted' | 'declined';
    created_at: string;
    photos: string[];
    handyman_id?: string;
}

export interface Payment {
    amount: number;
    method: 'cash' | 'card' | 'paypal' | 'venmo' | 'other';
    date: string;
}

export interface Job {
    id: string;
    quote_id: string;
    client_id: string;
    client_name: string;
    total_amount: number;
    job_name: string;
    schedule_date: string;
    completed_date?: string;
    labor_cost: number;
    materials_cost: number;
    handyman_id: string;
    before_photos: string[];
    after_photos: string[];
    notes: string;
    payments: Payment[];
    status: 'schedule' | 'in-progress' | 'completed' | 'invoiced' | 'paid';
    created_at: string;
}

type QuoteContextType = {
    // QUOTE list + draft builder
    quotes: Quote[];
    newQuote: Quote | null;
    addNewQuote: (q: Partial<Quote>) => Quote;
    updateNewQuote: (field: string, value: string | number) => void;
    clearNewQuote: () => void;

    /** Persist quote status / fields to Supabase (optimistic). */
    updateQuote: (id: string, updates: Partial<Quote>) => Promise<void>;
    /** Delete quote (+ line items) from Supabase (optimistic). */
    deleteQuote: (id: string) => Promise<void>;

    // LINE ITEMS (draft only — not persisted until quote save)
    lineItems: DraftLineItem[];
    updateLineItem: (idx: number, field: keyof DraftLineItem, value: string | number) => void;
    removeLineItem: (idx: number) => void;
    addLineItem: () => void;
    setLineItems: React.Dispatch<React.SetStateAction<DraftLineItem[]>>;

    // CLIENTS
    clients: Client[];
    addClient: (input: {
        name: string;
        phone?: string;
        email?: string;
        address?: string;
        notes?: string;
    }) => Promise<Client>;
    updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
    deleteClient: (id: string) => Promise<void>;

    // JOBS
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

function mapClientRow(row: any): Client {
    return {
        id: row.id,
        name: row.name ?? '',
        phone: row.phone ?? '',
        email: row.email ?? '',
        address: row.address ?? '',
        notes: row.notes ?? '',
        created_at: row.created_at,
        createdAt: row.created_at,
        handyman_id: row.handyman_id,
    };
}

function mapQuoteRow(row: any): Quote {
    const lineItems = (row.quote_line_items || []).map((li: any) => ({
        id: li.id,
        description: li.description ?? '',
        quantity: Number(li.quantity) || 0,
        unitPrice: Number(li.unit_price ?? li.unitPrice) || 0,
        isLabor: Boolean(li.is_labor ?? li.isLabor),
        photo_url: li.photo_url,
        photoUri: li.photo_url,
    }));

    return {
        id: row.id,
        client_id: row.client_id ?? null,
        client_name: row.client_name ?? '',
        client_phone: row.client_phone,
        template_id: row.template_id,
        job_name: row.job_name ?? '',
        quote_line_items: lineItems,
        notes: row.notes ?? '',
        total_amount: Number(row.total_amount) || 0,
        status: row.status ?? 'draft',
        created_at: row.created_at,
        photos: row.photos ?? [],
        handyman_id: row.handyman_id,
    };
}

function mapJobRow(row: any): Job {
    return {
        id: row.id,
        quote_id: row.quote_id,
        client_id: row.client_id,
        client_name: row.client_name ?? '',
        total_amount: Number(row.total_amount) || 0,
        job_name: row.job_name ?? row.jobName ?? '',
        schedule_date: row.schedule_date ?? row.scheduled_date ?? '',
        completed_date: row.completed_date,
        labor_cost: Number(row.labor_cost) || 0,
        materials_cost: Number(row.materials_cost ?? row.material_cost) || 0,
        handyman_id: row.handyman_id,
        before_photos: row.before_photos ?? [],
        after_photos: row.after_photos ?? [],
        notes: row.notes ?? '',
        payments: Array.isArray(row.payments) ? row.payments : [],
        status: row.status ?? 'schedule',
        created_at: row.created_at,
    };
}

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
        try {
            const {data, error} = await supabase
                .from('clients')
                .select('*')
                .eq('handyman_id', user.id)
                .order('created_at', {ascending: false});

            if (error) throw error;
            setClients((data || []).map(mapClientRow));
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to load clients. Please try again later.');
        }
    }, [user?.id]);

    const fetchJobs = useCallback(async () => {
        if (!user?.id) return;
        try {
            const {data, error} = await supabase
                .from('jobs')
                .select('*')
                .eq('handyman_id', user.id)
                .order('created_at', {ascending: false});

            if (error) throw error;
            setJobs((data || []).map(mapJobRow));
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to load jobs. Please try again later.');
        }
    }, [user?.id]);

    const fetchQuotes = useCallback(async () => {
        if (!user?.id) return;
        try {
            const {data, error} = await supabase
                .from('quotes')
                .select(
                    `
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
        `,
                )
                .eq('handyman_id', user.id)
                .order('created_at', {ascending: false});

            if (error) throw error;
            setQuotes((data || []).map(mapQuoteRow));
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to load quotes. Please try again later.');
        }
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

    // ── Draft quote builder (local only) ───────────────────────────────────

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

    // ── Quotes (persisted) ─────────────────────────────────────────────────

    const updateQuote = useCallback(
        async (id: string, updates: Partial<Quote>) => {
            if (!id) return;

            const prev = quotes;
            // Optimistic
            setQuotes((list) =>
                list.map((q) => (q.id === id ? {...q, ...updates} : q)),
            );

            try {
                const dbUpdates: Record<string, unknown> = {};
                if (updates.status !== undefined) dbUpdates.status = updates.status;
                if (updates.job_name !== undefined) dbUpdates.job_name = updates.job_name;
                if (updates.client_name !== undefined) dbUpdates.client_name = updates.client_name;
                if (updates.client_phone !== undefined) dbUpdates.client_phone = updates.client_phone;
                if (updates.client_id !== undefined) dbUpdates.client_id = updates.client_id;
                if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
                if (updates.total_amount !== undefined) dbUpdates.total_amount = updates.total_amount;
                if (updates.photos !== undefined) dbUpdates.photos = updates.photos;

                const {error} = await supabase.from('quotes').update(dbUpdates).eq('id', id);
                if (error) throw error;
            } catch (error: any) {
                setQuotes(prev); // rollback
                console.error(error);
                Alert.alert('Error', error.message || 'Failed to update quote');
                throw error;
            }
        },
        [quotes],
    );

    const deleteQuote = useCallback(
        async (id: string) => {
            if (!id) return;

            const prev = quotes;
            setQuotes((list) => list.filter((q) => q.id !== id));

            try {
                // Line items first (FK), then quote
                await supabase.from('quote_line_items').delete().eq('quote_id', id);
                const {error} = await supabase.from('quotes').delete().eq('id', id);
                if (error) throw error;
            } catch (error: any) {
                setQuotes(prev);
                console.error(error);
                Alert.alert('Error', error.message || 'Failed to delete quote');
                throw error;
            }
        },
        [quotes],
    );

    // ── Draft line items (local only) ──────────────────────────────────────

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

    // ── Clients (persisted) ────────────────────────────────────────────────

    const addClient = useCallback(
        async (input: {
            name: string;
            phone?: string;
            email?: string;
            address?: string;
            notes?: string;
        }): Promise<Client> => {
            if (!user?.id) throw new Error('Not logged in');

            const payload = {
                handyman_id: user.id,
                name: input.name.trim(),
                phone: input.phone?.trim() || null,
                email: input.email?.trim() || null,
                address: input.address?.trim() || null,
                notes: input.notes?.trim() || null,
            };

            const {data, error} = await supabase
                .from('clients')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            const client = mapClientRow(data);
            setClients((prev) => [client, ...prev]);
            return client;
        },
        [user?.id],
    );

    const updateClient = useCallback(
        async (id: string, updates: Partial<Client>) => {
            if (!id) return;

            const prev = clients;
            setClients((list) =>
                list.map((c) => (c.id === id ? {...c, ...updates} : c)),
            );

            try {
                const dbUpdates: Record<string, unknown> = {};
                if (updates.name !== undefined) dbUpdates.name = updates.name;
                if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
                if (updates.email !== undefined) dbUpdates.email = updates.email;
                if (updates.address !== undefined) dbUpdates.address = updates.address;
                if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

                const {error} = await supabase.from('clients').update(dbUpdates).eq('id', id);
                if (error) throw error;
            } catch (error: any) {
                setClients(prev);
                console.error(error);
                Alert.alert('Error', error.message || 'Failed to update client');
                throw error;
            }
        },
        [clients],
    );

    const deleteClient = useCallback(
        async (id: string) => {
            if (!id) return;

            const prev = clients;
            setClients((list) => list.filter((c) => c.id !== id));

            try {
                const {error} = await supabase.from('clients').delete().eq('id', id);
                if (error) throw error;
            } catch (error: any) {
                setClients(prev);
                console.error(error);
                Alert.alert('Error', error.message || 'Failed to delete client');
                throw error;
            }
        },
        [clients],
    );

    // ── Jobs (persisted) ───────────────────────────────────────────────────

    const updateJob = useCallback(
        async (id: string, updates: Partial<Job>) => {
            if (!id) return;

            const prev = jobs;
            setJobs((list) =>
                list.map((j) => (j.id === id ? {...j, ...updates} : j)),
            );

            try {
                const dbUpdates: Record<string, unknown> = {};
                if (updates.status !== undefined) dbUpdates.status = updates.status;
                if (updates.job_name !== undefined) dbUpdates.job_name = updates.job_name;
                if (updates.schedule_date !== undefined) {
                    dbUpdates.schedule_date = updates.schedule_date;
                    dbUpdates.scheduled_date = updates.schedule_date; // tolerate either column name
                }
                if (updates.completed_date !== undefined) dbUpdates.completed_date = updates.completed_date;
                if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
                if (updates.total_amount !== undefined) dbUpdates.total_amount = updates.total_amount;
                if (updates.labor_cost !== undefined) dbUpdates.labor_cost = updates.labor_cost;
                if (updates.materials_cost !== undefined) {
                    dbUpdates.materials_cost = updates.materials_cost;
                    dbUpdates.material_cost = updates.materials_cost;
                }
                if (updates.payments !== undefined) dbUpdates.payments = updates.payments;
                if (updates.before_photos !== undefined) dbUpdates.before_photos = updates.before_photos;
                if (updates.after_photos !== undefined) dbUpdates.after_photos = updates.after_photos;

                const {error} = await supabase.from('jobs').update(dbUpdates).eq('id', id);
                if (error) throw error;
            } catch (error: any) {
                setJobs(prev);
                console.error(error);
                Alert.alert('Error', error.message || 'Failed to update job');
                throw error;
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
                    // If no payments recorded, count completed/paid jobs at full amount
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
