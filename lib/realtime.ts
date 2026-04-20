import {supabase} from './supabase';
import * as Notifications from 'expo-notifications';
import {useEffect} from 'react';
import {useAuth} from "@/context/auth-context";

export function usePaymentNotifications() {
    const {user} = useAuth();

    useEffect(() => {
        if (!user) return;

        // Subscribe to changes on quotes table for this handyman
        const channel = supabase
            .channel('quote-payments')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'quotes',
                    filter: `handyman_id=eq.${user.id}`,
                },
                (payload) => {
                    const newStatus = payload.new.status;
                    const oldStatus = payload.old.status;

                    // If status changed to "paid"
                    if (newStatus === 'paid' && oldStatus !== 'paid') {
                        const amount = payload.new.total_amount || 0;
                        const quoteId = payload.new.id;

                        // Show local notification
                        Notifications.scheduleNotificationAsync({
                            content: {
                                title: "💰 Deposit Received!",
                                body: `Client paid $${amount} deposit!`,
                                data: {quoteId, type: 'payment'},
                            },
                            trigger: null,
                        });
                    }
                }
            )
            .subscribe();

        // Cleanup on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);
}