import React, {useEffect, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {supabase} from "@/lib/supabase";
import {useStripe} from '@stripe/stripe-react-native';
import {useProfile} from "@/context/profile-context";
import * as Clipboard from 'expo-clipboard';
import {Feather} from "@expo/vector-icons";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import useThemedNavigation from "@/hooks/use-navigation-theme";

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    is_labor: boolean;
    photo_url?: string;
}

interface QuoteDetailType {
    id: string;
    client_name: string;
    client_phone?: string;
    job_name: string;
    notes?: string;
    total_amount: number;
    status: string;
    created_at: string;
    line_items: LineItem[];
}

export default function QuoteDetail() {
    const {id} = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const {profile} = useProfile();
    const [quote, setQuote] = useState<QuoteDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();
    const {colors} = useThemedNavigation();

    const sendToClient = async () => {
        if (!quote) return;

        const publicLink = `${process.env.EXPO_PUBLIC_SITE_URL}/quotes/client-view/${quote.id}`;

        await Clipboard.setStringAsync(publicLink);

        Alert.alert(
            "Link Ready!",
            `Send this link to ${quote.client_name}:\n\n${publicLink}\n\nThey can open it on any phone or computer to view the quote, approve, and pay the deposit.`,
            [
                {text: "Copy Link", onPress: () => Alert.alert("Copied!")},
                {text: "Test Link", onPress: () => router.push(`/quotes/client-view/${quote.id}`)},
            ]
        );
    };

    const handleAccept = async () => {
        try {
            const {data: {user}} = await supabase.auth.getUser();

            if (!user) {
                Alert.alert('Not logged in');
                return;
            }

            await supabase
                .from('jobs')
                .insert({
                    job_name: quote?.job_name,
                    client_id: "80fc01b6-3ebe-4e58-9d11-8a211db41b27",
                    client_name: quote?.client_name,
                    handyman_id: user?.id,
                    scheduled_date: null,
                    completed_date: null,
                    quote_id: quote?.id,
                    total_amount: quote?.total_amount,
                    labor_cost: 0,
                    material_cost: 0,
                    before_photos: [],
                    after_photos: [],
                    payments: []
                })
        }catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to accept quote');
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
          job_name,
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
                     <div class="header">
                        <h1>FixBid Handyman Quote</h1>
                        ${profile ? `
                          <p><strong>${profile.business_name || profile.full_name}</strong></p>
                          <p>${profile.phone} • ${profile.address || 'South Florida'}</p>
                        ` : ''}
                        <p>Date: ${new Date().toLocaleDateString()}</p>
                      </div>
                      
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
        <View className="flex-1 bg-background">
            <View className="flex-row items-center gap-3 px-4 pb-3"
                  style={{paddingTop: insets.top + 12}}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Feather name="arrow-left" size={22} color=""/>
                </TouchableOpacity>

                <Text className="text-foreground flex-1 text-[17px] font-bold" numberOfLines={1}>
                    {quote.job_name}
                </Text>

                <View className={`mt-2 px-4 py-1 rounded-full self-end ${
                    quote.status === 'approved' ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                    <Text className={`text-xs font-medium capitalize ${
                        quote.status === 'approved' ? 'text-green-700' : 'text-amber-700'
                    }`}>
                        {quote.status}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerClassName="px-4 pb-28">
                <View className="bg-secondary-foreground mb-4 rounded-[20px] p-6">
                    <Text className="text-[11px] font-bold uppercase tracking-[1px] text-slate-400">
                        QUOTE
                    </Text>
                    <Text className="text-[42px] font-black tracking-[-1px] text-white">
                        ${quote.total_amount.toLocaleString()}
                    </Text>
                    <Text className="mt-1 text-[16px] text-slate-400">
                        {quote.client_name}
                    </Text>
                    <Text className="text-[13px] text-slate-400">
                        {quote.client_phone}
                    </Text>
                    <Text className="mt-1 text-[13px] text-slate-500">
                        {formatDate(quote.created_at)}
                    </Text>
                </View>

                <View className="bg-card mb-3 rounded-2xl p-4">
                    <Text className="text-foreground mb-2 text-[14px] font-bold uppercase tracking-[0.5px]">
                        Line Items
                    </Text>

                    {quote.line_items.map((li, i) => (
                        <View
                            key={i}
                            className="flex-row items-start justify-between border-b border-zinc-300 py-2.5"
                        >
                            <View className="flex-1 gap-0.5">
                                <Text className="text-foreground text-[14px] font-semibold">
                                    {li.description}
                                </Text>
                                <Text className="text-muted-foreground text-[12px]">
                                    {li.quantity} × ${li.unit_price.toFixed(2)}
                                </Text>
                            </View>

                            <Text className="text-foreground text-[15px] font-bold">
                                ${(li.quantity * li.unit_price).toFixed(2)}
                            </Text>
                        </View>
                    ))}

                    <View className="mt-1 flex-row items-center justify-between border-t border-zinc-200 pt-3">
                        <Text className="text-muted-foreground text-[14px] font-semibold">
                            Total
                        </Text>
                        <Text className="text-primary text-[22px] font-extrabold tracking-[-0.5px]">
                            ${quote.total_amount.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {quote.notes ? (
                    <View
                        className="bg-card mb-3 rounded-2xl p-4"
                    >
                        <Text
                            className="text-foreground mb-2 text-[14px] font-bold uppercase tracking-[0.5px]"
                        >
                            Notes
                        </Text>
                        <Text className="text-muted-foreground text-[14px] leading-5">
                            {quote.notes}
                        </Text>
                    </View>
                ) : null}

                {quote.status === "draft" && (
                    <TouchableOpacity
                        className="bg-primary mb-2 flex-row items-center justify-center gap-2 rounded-2xl p-4"
                        onPress={sendToClient}
                        activeOpacity={0.85}
                    >
                        <Feather name="send" size={18} color={colors.icon}/>
                        <Text className="text-[16px] font-bold text-white">Send to Client</Text>
                    </TouchableOpacity>
                )}

                {quote.status === "sent" && (
                    // FOR TESTING
                    <>
                        <View className="mb-2 flex-row gap-2.5">
                            <TouchableOpacity
                                className="bg-chart-3 flex-[2] flex-row items-center justify-center gap-1.5 rounded-2xl p-3.5"
                                onPress={handleAccept}
                                activeOpacity={0.85}
                            >
                                <Feather name="check" size={18} color={colors.icon}/>
                                <Text className="text-[15px] font-bold text-white">Accepted → Job</Text>
                            </TouchableOpacity>
                        </View>

                        <View
                            className="bg-success flex-row items-center gap-2.5 rounded-xl border p-3.5"
                        >
                            <Feather name="check-circle" size={20} color={colors.icon}/>
                            <Text className="text-success text-[14px] font-semibold">
                                Waiting for client
                            </Text>
                        </View>
                    </>
                )}

                {quote.status === "accepted" && (
                    <View
                        className="bg-success flex-row items-center gap-2.5 rounded-xl border p-3.5"
                    >
                        <Feather name="check-circle" size={20} color={colors.icon}/>
                        <Text className="text-success text-[14px] font-semibold">
                            Quote accepted — converted to a job
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}