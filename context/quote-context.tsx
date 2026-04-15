import React, {createContext, ReactNode, useCallback, useContext, useEffect, useState} from 'react';
import {toKeyAlias} from "@babel/types";
import uid = toKeyAlias.uid;
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
    clientId: string;
    clientName: string;
    templateId?: string;
    jobName: string;
    lineItems: LineItem[];
    notes: string;
    total: number;
    status: "draft" | "sent" | "accepted" | "declined";
    createdAt: string;
    photos: string[];
}

type QuoteContextType = {
    quotes: Quote[];
    addQuote: (q: Omit<Quote, "id" | "createdAt">) => Quote;
    updateQuote: (id: string, updates: Partial<Quote>) => void;
    deleteQuote: (id: string) => void;
    clearQuotes: () => void;

    lineItems: Line[];
    updateLineItem: (idx: number, field: keyof LineItem, value: string | number) => void;
    removeLineItem: (idx: number) => void;
    addLineItem: () => void;
    setLineItems: React.Dispatch<React.SetStateAction<Line[]>>;

    clients: any[];
};

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({children}: { children: ReactNode }) {
    const {user} = useAuth();

    const [clients, setClients] = useState<any[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [lineItems, setLineItems] = useState<Line[]>([{
        description: "Labor",
        quantity: 1,
        unitPrice: 0,
        isLabor: true
    }]);

    const addQuote = useCallback(
        (q: Omit<Quote, "id" | "createdAt">): Quote => {
            const newQuote: Quote = {...q, id: uid(), createdAt: new Date().toISOString()};
            setQuotes((prev) => {
                return [newQuote, ...prev];
            });
            return newQuote;
        },
        []
    );

    const updateQuote = useCallback(
        (id: string, updates: Partial<Quote>) => {
            setQuotes((prev) => {
                return prev.map((q) => (q.id === id ? {...q, ...updates} : q));
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

    const clearQuotes = () => setQuotes([]);

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

    useEffect(() => {
        const fetchClients = async () => {
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
            }
        };

        if (!user?.id) return;
        fetchClients();
    }, [user?.id]);

    return (
        <QuoteContext.Provider value={{
            quotes,
            addQuote,
            updateQuote,
            deleteQuote,
            clearQuotes,

            lineItems,
            updateLineItem,
            removeLineItem,
            addLineItem,
            setLineItems,

            clients,
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