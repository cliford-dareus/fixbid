import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    isLabor: boolean;
    photoUri?: string;
}

type QuoteContextType = {
    lineItems: LineItem[];
    addLineItem: (newItem: Omit<LineItem, 'id'>) => void;
    removeLineItem: (id: string) => void;
    updateLineItem: (id: string, updates: Partial<LineItem>) => void;
    clearLineItems: () => void;
};

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children }: { children: ReactNode }) {
    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    const addLineItem = (newItem: Omit<LineItem, 'id'>) => {
        const item: LineItem = {
            ...newItem,
            id: Date.now().toString(),
        };
        setLineItems(prev => [...prev, item]);
    };

    const removeLineItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    const updateLineItem = (id: string, updates: Partial<LineItem>) => {
        setLineItems(prev =>
            prev.map(item =>
                item.id === id ? { ...item, ...updates } : item
            )
        );
    };

    const clearLineItems = () => setLineItems([]);

    return (
        <QuoteContext.Provider value={{
            lineItems,
            addLineItem,
            removeLineItem,
            updateLineItem,
            clearLineItems,
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