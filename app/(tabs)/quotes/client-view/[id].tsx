import React, {useEffect, useState} from 'react';
import {View, Text, ScrollView, Image, TouchableOpacity, Alert} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {useStripe} from '@stripe/stripe-react-native';
import {supabase} from "@/lib/supabase";
import {useProfile} from "@/context/profile-context";

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    photo_url?: string;
}

export default function ClientQuoteView() {
    const {id} = useLocalSearchParams<{ id: string }>();
    const {initPaymentSheet, presentPaymentSheet} = useStripe();
    const { profile } = useProfile();
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchPublicQuote = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/public-quote?id=${id}`
            );
            const result = await response.json();
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

        const depositAmount = Math.round(quote.total_amount * 0.5);

        try {
            // Call your Supabase Edge Function
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_KEY}`,
                    },
                    body: JSON.stringify({
                        quote_id: quote.id,
                        deposit_amount: depositAmount,
                        customer_email: "client@example.com", // you can collect this or use phone
                    }),
                }
            );

            const { clientSecret, error } = await response.json();

            if (error) throw new Error(error);

            // Initialize PaymentSheet
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: "FixBid Handyman",
                paymentIntentClientSecret: clientSecret,
                allowsDelayedPaymentMethods: true,

            });

            if (initError) throw initError;

            // Present the sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                Alert.alert("Payment cancelled", presentError.message);
            } else {
                Alert.alert(
                    "✅ Payment Successful!",
                    `$${depositAmount} deposit received.\n\nThank you! Cliford will contact you soon to schedule the job.`
                );

                // Optional: Update quote status in Supabase
                await supabase.from('quotes').update({ status: 'approved' }).eq('id', quote.id);
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Payment failed. Please try again.");
        }
    };

    if (loading) {
        return <View className="flex-1 justify-center items-center"><Text>Loading quote...</Text></View>;
    }

    if (!quote) {
        return <View className="flex-1 justify-center items-center"><Text>Quote not found</Text></View>;
    }

    return (
        <ScrollView className="flex-1 bg-white">
            <View className="bg-blue-600 pt-12 pb-8 px-6">
                <Text className="text-white text-4xl font-bold">Your Quote</Text>
                {profile && (
                    <Text className="text-blue-100 mt-1 text-lg">
                        From {profile.business_name || profile.full_name} • Handyman
                        {'\n'}{profile.phone}
                    </Text>
                )}
            </View>

            <View className="px-6 pt-8">
                <Text className="text-3xl font-bold">Hello {quote.client_name.split(' ')[0]}!</Text>
                <Text className="text-2xl font-bold text-green-600 mt-6">
                    Total: ${quote.total_amount}
                </Text>

                {/* Line Items */}
                <View className="mt-10">
                    {quote.line_items?.map((item: LineItem, index: number) => (
                        <View key={index} className="mb-8 bg-gray-50 p-5 rounded-3xl">
                            <Text className="font-semibold text-lg">{item.description}</Text>
                            <Text className="text-xl text-green-600 mt-2">
                                ${item.unit_price} × {item.quantity}
                            </Text>

                            {item.photo_url && (
                                <Image
                                    source={{uri: item.photo_url}}
                                    className="w-full h-56 rounded-2xl mt-4"
                                    resizeMode="cover"
                                />
                            )}
                        </View>
                    ))}
                </View>

                {quote.notes && (
                    <View className="mt-6 bg-gray-50 p-5 rounded-3xl">
                        <Text className="font-semibold mb-2">Notes from Cliford:</Text>
                        <Text className="text-gray-700">{quote.notes}</Text>
                    </View>
                )}
            </View>

            {/* Big Action Buttons */}
            <View className="px-6 py-10">
                <TouchableOpacity
                    onPress={handleApproveAndPay}
                    className="bg-green-600 py-6 rounded-3xl mb-4"
                >
                    <Text className="text-white text-center text-2xl font-bold">
                        Approve & Pay ${Math.round(quote.total_amount * 0.5)} Deposit
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => Alert.alert('Message Sent', 'You can now text Cliford directly')}
                    className="border border-gray-300 py-5 rounded-3xl"
                >
                    <Text className="text-center text-gray-700 text-lg">Message Cliford</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}