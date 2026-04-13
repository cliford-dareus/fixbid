import React, {useEffect, useState} from 'react';
import {View, Text, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {ArrowLeft, Download, Edit2} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {supabase} from "@/lib/supabase";
import {useStripe} from '@stripe/stripe-react-native';
import {WebView} from 'react-native-webview'; // if you want in-app preview

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    is_labor: boolean;
    photo_url?: string;
}

interface QuoteDetail {
    id: string;
    client_name: string;
    client_phone?: string;
    notes?: string;
    total_amount: number;
    status: string;
    created_at: string;
    line_items: LineItem[];
}

export default function QuoteDetail() {
    const {id} = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [quote, setQuote] = useState<QuoteDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const {initPaymentSheet, presentPaymentSheet} = useStripe();

    const sendToClient = async () => {
        if (!quote) return;

        // For MVP: Generate a simple deep link or public URL
        // In production: Create a signed URL or store a public quote token in DB
        const publicLink = `https://yourdomain.com/quote/${quote.id}`; // We'll simulate for now

        Alert.alert(
            'Quote Ready to Send',
            `Send this link to ${quote.client_name}:\n\n${publicLink}\n\nThey can view, approve, and pay deposit.`,
            [
                {
                    text: 'Copy Link', onPress: () => {/* Use Clipboard */
                    }
                },
                {text: 'Simulate Client View', onPress: () => showClientPreview(quote)},
            ]
        );
    };

    const showClientPreview = (quoteData: any) => {
        // In real app, you'd open a modal with WebView or navigate to a client screen
        Alert.alert(
            'Client View Preview',
            'Client sees: Beautiful quote with photos + Approve + Pay Deposit buttons.\n\nNext step: Real public page + Stripe.',
            [{text: 'Test Deposit Payment', onPress: () => testDepositPayment(quoteData.total_amount * 0.5)}]
        );
    };

    const testDepositPayment = async (depositAmount: number) => {
        try {
            // In real flow: Call your backend (Supabase Edge Function) to create PaymentIntent
            // For demo, we'll simulate
            const {error} = await initPaymentSheet({
                merchantDisplayName: 'FixBid Handyman',
                paymentIntentClientSecret: 'pi_fake_secret_for_demo', // Replace with real from backend
            });

            if (error) {
                Alert.alert('Error', error.message);
                return;
            }

            const {error: presentError} = await presentPaymentSheet();
            if (presentError) {
                Alert.alert('Payment failed', presentError.message);
            } else {
                Alert.alert('Success!', `Client paid $${depositAmount} deposit. Status updated to Approved.`);
                // TODO: Update quote status in Supabase to 'approved'
            }
        } catch (e) {
            Alert.alert('Payment Error', 'Something went wrong');
        }
    };

    const fetchQuote = async () => {
        if (!id) return;

        setLoading(true);
        try {
            const {data, error} = await supabase
                .from('quotes')
                .select(`
          id,
          client_name,
          client_phone,
          notes,
          total_amount,
          status,
          created_at,
          quote_line_items (
            id,
            description,
            quantity,
            unit_price,
            is_labor,
            photo_url
          )
        `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setQuote({
                ...data,
                line_items: data.quote_line_items || []
            });
        } catch (error: any) {
            Alert.alert('Error', 'Failed to load quote details');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuote();
    }, [id]);

    const regeneratePDF = async () => {
        if (!quote) return;

        const htmlContent = `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                h1 { color: #1e40af; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #f1f5f9; }
                .photo { max-width: 300px; border-radius: 8px; margin: 10px 0; }
                .total { font-size: 26px; font-weight: bold; color: #15803d; text-align: right; }
              </style>
            </head>
            <body>
              <h1>FixBid Handyman - Quote</h1>
              <p style="text-align:center;">Cliford Dareus • Miramar, FL • ${new Date().toLocaleDateString()}</p>
              
              <h2>Client: ${quote.client_name}</h2>
              ${quote.client_phone ? `<p>Phone: ${quote.client_phone}</p>` : ''}
              
              <table>
                <thead>
                  <tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                </thead>
                <tbody>
                  ${quote.line_items.map(item => `
                    <tr>
                      <td>${item.description}</td>
                      <td>${item.quantity}</td>
                      <td>$${item.unit_price}</td>
                      <td>$${(item.quantity * item.unit_price).toFixed(2)}</td>
                    </tr>
                    ${item.photo_url ? `
                      <tr><td colspan="4"><img src="${item.photo_url}" class="photo" /></td></tr>
                    ` : ''}
                  `).join('')}
                </tbody>
              </table>
              
              <div class="total">Total: $${quote.total_amount}</div>
              ${quote.notes ? `<p><strong>Notes:</strong><br>${quote.notes}</p>` : ''}
            </body>
          </html>
    `;

        try {
            const {uri} = await Print.printToFileAsync({html: htmlContent});
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
                Alert.alert('PDF Shared', 'Quote PDF opened in share sheet');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to generate PDF');
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#3b82f6"/>
            </View>
        );
    }

    if (!quote) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <Text>Quote not found</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-blue-600 pt-12 pb-6 px-6 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <ArrowLeft size={28} color="white"/>
                </TouchableOpacity>
                <Text className="text-white text-2xl font-bold flex-1">Quote Details</Text>
                <TouchableOpacity onPress={regeneratePDF}>
                    <Download size={28} color="white"/>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                <View className="bg-white rounded-3xl p-6 mb-6">
                    <Text className="text-3xl font-bold">{quote.client_name}</Text>
                    {quote.client_phone && <Text className="text-gray-600 mt-1">📱 {quote.client_phone}</Text>}
                    <Text className="text-gray-500 mt-4">
                        Created: {new Date(quote.created_at).toLocaleDateString()}
                    </Text>
                    <Text className="text-4xl font-bold text-green-600 mt-6">
                        ${quote.total_amount}
                    </Text>
                </View>

                {/* Line Items */}
                <Text className="text-xl font-semibold mb-4 px-1">Job Details</Text>
                {quote.line_items.map((item, index) => (
                    <View key={item.id} className="bg-white rounded-3xl p-5 mb-6">
                        <Text className="font-semibold text-lg">Item {index + 1}</Text>
                        <Text className="text-xl mt-2">{item.description}</Text>
                        <Text className="text-2xl font-bold text-green-600 mt-3">
                            ${item.unit_price} × {item.quantity} = ${(item.quantity * item.unit_price).toFixed(2)}
                        </Text>

                        {item.photo_url && (
                            <Image
                                source={{uri: item.photo_url}}
                                className="w-full h-64 rounded-2xl mt-5"
                                resizeMode="cover"
                            />
                        )}
                    </View>
                ))}

                {quote.notes && (
                    <View className="bg-white rounded-3xl p-6 mb-8">
                        <Text className="font-semibold mb-3">Notes</Text>
                        <Text className="text-gray-700">{quote.notes}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Action Buttons */}
            <View className="p-6 bg-white border-t border-gray-200 flex-row gap-3">
                <TouchableOpacity
                    onPress={() => router.push(`/(tabs)/quotes/client-view/${id}`)}
                    className="flex-1 bg-blue-600 py-4 rounded-2xl"
                >
                    <Text className="text-white text-center font-semibold text-lg">Send to Client</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={regeneratePDF}
                    className="flex-1 bg-green-600 py-4 rounded-2xl"
                >
                    <Text className="text-white text-center font-semibold text-lg">PDF Again</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}