import React, {useEffect, useState} from 'react';
import {View, Text, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {useStripe} from '@stripe/stripe-react-native';
import {supabase} from '@/lib/supabase';
import {useProfile} from '@/context/profile-context';

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    photo_url?: string;
}

export default function ClientQuoteView() {
    const {id} = useLocalSearchParams<{id: string}>();
    const {initPaymentSheet, presentPaymentSheet} = useStripe();
    const {profile} = useProfile();
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);

    const fetchPublicQuote = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/public-quote?id=${id}`,
            );
            const result = await response.json();
            if (!result.success && !result.quote) {
                throw new Error(result.message || 'Quote not found');
            }
            setQuote(result.quote);
        } catch (error) {
            Alert.alert('Error', 'Could not load quote');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        fetchPublicQuote();
    }, [id]);

    const handleApproveAndPay = async () => {
        if (!quote) return;

        const total = Number(quote.total_amount) || 0;
        const depositAmount = Math.round(total * 50) / 100;

        setPaying(true);
        try {
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_KEY}`,
                    },
                    body: JSON.stringify({
                        quote_id: quote.id,
                        deposit_amount: depositAmount,
                    }),
                },
            );

            const payload = await response.json();
            const clientSecret = payload.clientSecret || payload.client_secret;
            if (payload.error) throw new Error(payload.error);
            if (!clientSecret) throw new Error('No payment client secret returned');

            const merchantName =
                profile?.business_name || profile?.full_name || 'FixBid Handyman';

            const {error: initError} = await initPaymentSheet({
                merchantDisplayName: merchantName,
                paymentIntentClientSecret: clientSecret,
                allowsDelayedPaymentMethods: true,
            });

            if (initError) throw initError;

            const {error: presentError} = await presentPaymentSheet();

            if (presentError) {
                Alert.alert('Payment cancelled', presentError.message);
            } else {
                // Prefer accepted to match list filters / public page paid states
                await supabase
                    .from('quotes')
                    .update({status: 'accepted'})
                    .eq('id', quote.id);

                setQuote((prev: any) => (prev ? {...prev, status: 'accepted'} : prev));

                Alert.alert(
                    'Payment successful',
                    `$${depositAmount.toFixed(2)} deposit received.\n\nThank you! Your contractor will contact you to schedule the job.`,
                );
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Payment failed. Please try again.');
        } finally {
            setPaying(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6"/>
                <Text className="mt-3 text-gray-500">Loading quote...</Text>
            </View>
        );
    }

    if (!quote) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text>Quote not found</Text>
            </View>
        );
    }

    const total = Number(quote.total_amount) || 0;
    const deposit = Math.round(total * 50) / 100;
    const status = (quote.status || '').toLowerCase();
    const isPaid = ['accepted', 'approved', 'deposit_paid', 'paid'].includes(status);
    const lineItems: LineItem[] = quote.line_items || quote.quote_line_items || [];
    const firstName = (quote.client_name || 'there').split(' ')[0];

    return (
        <ScrollView className="flex-1 bg-white">
            <View className="bg-blue-600 pt-12 pb-8 px-6">
                <Text className="text-white text-4xl font-bold">Your Quote</Text>
                {profile && (
                    <Text className="text-blue-100 mt-1 text-lg">
                        From {profile.business_name || profile.full_name} • Handyman
                        {'\n'}
                        {profile.phone}
                    </Text>
                )}
            </View>

            <View className="px-6 pt-8">
                <Text className="text-3xl font-bold">Hello {firstName}!</Text>
                <Text className="text-2xl font-bold text-green-600 mt-6">Total: ${total.toFixed(2)}</Text>
                <Text className="text-base text-gray-600 mt-2">
                    Deposit due today (50%): ${deposit.toFixed(2)}
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                    Balance on completion: ${(total - deposit).toFixed(2)}
                </Text>

                <View className="mt-10">
                    {lineItems.map((item, index) => (
                        <View key={item.id || index} className="mb-8 bg-gray-50 p-5 rounded-3xl">
                            <Text className="font-semibold text-lg">{item.description}</Text>
                            <Text className="text-xl text-green-600 mt-2">
                                ${Number(item.unit_price).toFixed(2)} × {item.quantity}
                            </Text>

                            {item.photo_url ? (
                                <Image
                                    source={{uri: item.photo_url}}
                                    className="w-full h-56 rounded-2xl mt-4"
                                    resizeMode="cover"
                                />
                            ) : null}
                        </View>
                    ))}
                </View>

                {quote.notes ? (
                    <View className="mt-6 bg-gray-50 p-5 rounded-3xl">
                        <Text className="font-semibold mb-2">Notes from your contractor:</Text>
                        <Text className="text-gray-700">{quote.notes}</Text>
                    </View>
                ) : null}
            </View>

            <View className="px-6 py-10">
                {isPaid ? (
                    <View className="bg-green-50 border border-green-200 py-6 rounded-3xl mb-4">
                        <Text className="text-green-800 text-center text-xl font-bold">
                            Deposit received — thank you!
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={handleApproveAndPay}
                        disabled={paying}
                        className="bg-green-600 py-6 rounded-3xl mb-4"
                    >
                        {paying ? (
                            <ActivityIndicator color="#fff"/>
                        ) : (
                            <Text className="text-white text-center text-2xl font-bold">
                                Approve & Pay ${deposit.toFixed(2)} Deposit
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
}
