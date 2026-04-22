import React, {createContext, ReactNode, useCallback, useContext, useEffect, useState} from 'react';
import {useAuth} from "@/context/auth-context";
import {supabase} from "@/lib/supabase";
import {Alert} from "react-native";

export interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    isLabor: boolean;
    photoUri?: string;
}

export interface Client {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    createdAt: string;
}

interface Line {
    description: string;
    quantity: number;
    unitPrice: number;
    isLabor: boolean;
    photoUri?: string;
}

export interface Quote {
    id: string;
    client_id: string;
    client_name: string;
    template_id?: string;
    job_name: string;
    quote_line_items: LineItem[];
    notes: string;
    total_amount: number;
    status: "draft" | "sent" | "accepted" | "declined";
    created_at: string;
    photos: string[];
}

export interface Payment {
    amount: number;
    method: "cash" | "card" | "paypal" | "venmo" | "other";
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
    status: "schedule" | "in-progress" | "completed" | "invoiced" | "paid";
    created_at: string;
}

type QuoteContextType = {
    // QUOTE
    quotes: Quote[];
    newQuote: Quote | null;
    addNewQuote: (q: Omit<Quote, "id" | "createdAt">) => Quote;
    updateNewQuote: (field: string, value: string | number) => void;
    addQuote: (q: Omit<Quote, "id" | "createdAt">) => Quote;
    updateQuote: (id: string | undefined, updates: Partial<Quote>) => void;
    deleteQuote: (id: string) => void;
    clearNewQuote: () => void;

    // LINE ITEMS
    lineItems: Line[];
    updateLineItem: (idx: number, field: keyof LineItem, value: string | number) => void;
    removeLineItem: (idx: number) => void;
    addLineItem: () => void;
    setLineItems: React.Dispatch<React.SetStateAction<Line[]>>;

    // CLIENTS
    clients: any[];
    updateClient: (id: string | undefined, updates: Partial<Client>) => void;
    deleteClient: (id: string) => void;

    // JOBS
    jobs: Job[];
    updateJob: (id: string | undefined, updates: Partial<Job>) => void;
    getTodayJobs: () => Job[];
    getMonthRevenue: (month?: number, year?: number) => number;

    fetchClients: () => Promise<void>;
    fetchQuotes: () => Promise<void>;
    fetchJobs: () => Promise<void>;

    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({children}: { children: ReactNode }) {
    const {user} = useAuth();
    const [newQuote, setNewQuote] = useState<Quote | null>(null);
    const [lineItems, setLineItems] = useState<Line[]>([]);
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const {data, error} = await supabase
                .from('clients')
                .select()
                .eq("handyman_id", user?.id)

            if (error) throw error;
            setClients(data || []);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to load clients. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const {data, error} = await supabase
                .from('jobs')
                .select()
                .eq("handyman_id", user?.id)
            if (error) throw error;
            setJobs(data || []);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to load jobs. Please try again later.');
        } finally {
            setLoading(false);
        }
    }

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const {data, error} = await supabase
                .from('quotes')
                .select(
                    `
          id,
          client_name,
          total_amount,
          job_name,
          status,
          created_at,
          quote_line_items (
            id,
            description,
            photo_url
          )
        `)
                .eq("handyman_id", user?.id)
                .order('created_at', {ascending: false})
            if (error) throw error;
            setQuotes(data as unknown as Quote[] || [])
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load quotes. Please try again later.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!user?.id) return;
        fetchClients();
        fetchJobs();
        fetchQuotes();
    }, [user?.id]);

    // QUOTES
    const addQuote = useCallback(
        (q: Omit<Quote, "id" | "created_at">): Quote => {
            const newQuote: Quote = {...q, id: "", created_at: new Date().toISOString()};
            setQuotes((prev) => {
                return [newQuote, ...prev];
            });
            setLineItems(q.quote_line_items)
            return newQuote;
        },
        []
    );

    const updateQuote = useCallback(
        (id: string | undefined, updates: Partial<Quote>) => {
            setQuotes((prev) => {
                const nextQuotes = [...prev];

                if (id) {
                    return nextQuotes.map((quote) =>
                        quote.id === id ? {...quote, ...updates} : quote
                    );
                }

                if (nextQuotes.length === 0) {
                    return nextQuotes;
                }

                nextQuotes[0] = {...nextQuotes[0], ...updates};
                return nextQuotes;
            });

        },
        []
    );

    const deleteQuote = useCallback(
        (id: string) => {
            setQuotes((prev) => {
                return prev.filter((q) => q.id !== id);
            });
        },
        []
    );

    const addNewQuote = useCallback(
        (q: Omit<Quote, "id" | "created_at">) => {
            const newQuote: Quote = {...q, id: "", created_at: new Date().toISOString()};
            setNewQuote(newQuote);
            return newQuote;
        },
        []
    );

    const updateNewQuote = useCallback(
        (field: string, value: string | number) => {
            setNewQuote((prev) => {
                if (!prev) return prev;
                return {...prev, [field]: value};
            });
        },
        []
    );

    const clearNewQuote = () => {
        setLineItems([])
        setNewQuote(null)
    };

    const getRecentQuotes = useCallback(() => {

    }, []);

    //  LINE ITEMS
    const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
        setLineItems((prev) =>
            prev.map((li, i) => (i === idx ? {...li, [field]: value} : li))
        );
    };

    const removeLineItem = (idx: number) => {
        setLineItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const addLineItem = () => {
        setLineItems((prev) => [...prev, {description: "", quantity: 1, unitPrice: 0, isLabor: true}]);
    };

    // JOBS
    const updateJob = (id: string | undefined, updates: Partial<any>) => {
        setJobs((prev) =>
            prev.map((job) => job.id === id ? {...job, ...updates} : job)
        )
    };

    const getTodayJobs = () => {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        return jobs.filter(job => {
            const jobDate = new Date(job.schedule_date);
            return jobDate >= startOfDay && jobDate <= endOfDay;
        });
    }

    // CLIENTS
    const updateClient = (id: string | undefined, updates: Partial<Client>) => {
        setClients((prev) =>
            prev.map((client) => client.id === id ? {...client, ...updates} : client)
        )
    };

    const deleteClient = (id: string) => {
        setClients((prev) => prev.filter((client) => client.id !== id));
    }

    const getMonthRevenue = useCallback((month?: number, year?: number) => {
        const now = new Date();
        return jobs.filter((job: Job) => {
            const d = new Date(job.created_at);
            return d.getMonth() === (month || now.getMonth()) && d.getFullYear() === (year || now.getFullYear());
        })
            .reduce((acc, job: Job) => {
                const paid = job.payments.reduce((s, payment) => s + payment.amount, 0);
                return acc + paid;
            }, 0);
    }, [jobs]);

    return (
        <QuoteContext.Provider value={{
            newQuote,
            addNewQuote,
            updateNewQuote,
            quotes,
            addQuote,
            updateQuote,
            deleteQuote,
            clearNewQuote,

            lineItems,
            updateLineItem,
            removeLineItem,
            addLineItem,
            setLineItems,

            clients,
            updateClient,
            deleteClient,

            jobs,
            updateJob,
            getTodayJobs,
            getMonthRevenue,

            fetchClients,
            fetchQuotes,
            fetchJobs,

            loading,
            setLoading,
        }}>
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