import React, {useEffect, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Share} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {useAuth} from '@/context/auth-context';
import {useProfile} from '@/context/profile-context';
import {useQuote} from '@/context/quote-context';
import {jobsApi, quotesApi, type Quote} from '@/lib/data';
import * as Clipboard from 'expo-clipboard';
import {Feather} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import useThemedNavigation from '@/hooks/use-navigation-theme';

const PUBLIC_QUOTE_BASE = 'https://fixbid-ten.vercel.app';

const PAID_STATUSES = ['accepted', 'approved', 'deposit_paid', 'paid'];

export default function QuoteDetail() {
    const {id} = useLocalSearchParams<{id: string}>();
    const router = useRouter();
    const {user} = useAuth();
    const {profile} = useProfile();
    const {updateQuote, fetchJobs} = useQuote();
    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const insets = useSafeAreaInsets();
    const {colors} = useThemedNavigation();

    const fetchQuote = async () => {
        if (!id) return;

        setLoading(true);
        const result = await quotesApi.getQuote(id);
        if (!result.ok) {
            Alert.alert('Error', result.error || 'Failed to load quote details');
            console.error(result.error);
            setQuote(null);
        } else {
            setQuote(result.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchQuote();
    }, [id]);

    const sendToClient = async () => {
        if (!quote) return;

        const publicLink = `${PUBLIC_QUOTE_BASE}/?id=${quote.id}`;
        setSending(true);

        try {
            await updateQuote(quote.id, {status: 'sent'});
            setQuote((prev) => (prev ? {...prev, status: 'sent'} : prev));

            await Clipboard.setStringAsync(publicLink);

            try {
                await Share.share({
                    message: `Here's your FixBid quote: ${publicLink}`,
                    url: publicLink,
                    title: `Quote for ${quote.client_name}`,
                });
            } catch {
                // User dismissed share sheet
            }

            Alert.alert(
                'Quote sent',
                `Status updated to Sent.\n\nLink is on the clipboard:\n${publicLink}`,
                [
                    {text: 'OK'},
                    {
                        text: 'Preview',
                        onPress: () => router.push(`/quotes/client-view/${quote.id}`),
                    },
                ],
            );
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not update quote status');
        } finally {
            setSending(false);
        }
    };

    const handleAccept = async () => {
        if (!quote) return;

        try {
            if (!user?.id) {
                Alert.alert('Not logged in');
                return;
            }

            const jobResult = await jobsApi.createJob({
                handyman_id: user.id,
                job_name: quote.job_name,
                client_id: quote.client_id || null,
                client_name: quote.client_name,
                quote_id: quote.id,
                total_amount: quote.total_amount,
                labor_cost: 0,
                material_cost: 0,
                before_photos: [],
                after_photos: [],
                payments: [],
                status: 'schedule',
                notes: quote.notes || null,
            });

            if (!jobResult.ok) throw new Error(jobResult.error);

            await updateQuote(quote.id, {status: 'accepted'});
            setQuote((prev) => (prev ? {...prev, status: 'accepted'} : prev));

            try {
                await fetchJobs();
            } catch {
                // non-fatal
            }

            Alert.alert('Done', 'Quote accepted and converted to a job.');
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.message || 'Failed to accept quote');
        }
    };

    const regeneratePDF = async () => {
        if (!quote) return;

        const lineItems = quote.quote_line_items || [];

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
                          <p>${profile.phone || ''} ${profile.address ? '• ' + profile.address : ''}</p>
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
                      ${lineItems.map((item) => `
                        <tr>
                          <td>${item.description}</td>
                          <td>${item.quantity}</td>
                          <td>$${item.unitPrice}</td>
                          <td>$${(item.quantity * item.unitPrice).toFixed(2)}</td>
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

    const status = (quote.status || 'draft').toLowerCase();
    const isPaid = PAID_STATUSES.includes(status);
    const deposit = Math.round(Number(quote.total_amount) * 50) / 100;
    const lineItems = quote.quote_line_items || [];

    return (
        <View className="flex-1 bg-background">
            <View
                className="flex-row items-center gap-3 px-4 pb-3"
                style={{paddingTop: insets.top + 12}}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Feather name="arrow-left" size={22} color={colors.foreground || '#111'}/>
                </TouchableOpacity>

                <Text className="text-foreground flex-1 text-[17px] font-bold" numberOfLines={1}>
                    {quote.job_name}
                </Text>

                <View
                    className={`mt-2 px-4 py-1 rounded-full self-end ${
                        isPaid ? 'bg-green-100' : status === 'declined' ? 'bg-red-100' : 'bg-amber-100'
                    }`}
                >
                    <Text
                        className={`text-xs font-medium capitalize ${
                            isPaid
                                ? 'text-green-700'
                                : status === 'declined'
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                        }`}
                    >
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
                        ${Number(quote.total_amount).toLocaleString()}
                    </Text>
                    <Text className="mt-1 text-[16px] text-slate-400">{quote.client_name}</Text>
                    <Text className="text-[13px] text-slate-400">{quote.client_phone}</Text>
                    <Text className="mt-1 text-[13px] text-slate-500">
                        {formatDate(quote.created_at)}
                    </Text>
                    <Text className="mt-3 text-[13px] text-slate-400">
                        50% deposit: ${deposit.toFixed(2)}
                    </Text>
                </View>

                <View className="bg-card mb-3 rounded-2xl p-4">
                    <Text className="text-foreground mb-2 text-[14px] font-bold uppercase tracking-[0.5px]">
                        Line Items
                    </Text>

                    {lineItems.map((li, i) => (
                        <View
                            key={li.id || i}
                            className="flex-row items-start justify-between border-b border-zinc-300 py-2.5"
                        >
                            <View className="flex-1 gap-0.5">
                                <Text className="text-foreground text-[14px] font-semibold">
                                    {li.description}
                                </Text>
                                <Text className="text-muted-foreground text-[12px]">
                                    {li.quantity} × ${Number(li.unitPrice).toFixed(2)}
                                </Text>
                            </View>

                            <Text className="text-foreground text-[15px] font-bold">
                                ${(li.quantity * li.unitPrice).toFixed(2)}
                            </Text>
                        </View>
                    ))}

                    <View className="mt-1 flex-row items-center justify-between border-t border-zinc-200 pt-3">
                        <Text className="text-muted-foreground text-[14px] font-semibold">Total</Text>
                        <Text className="text-primary text-[22px] font-extrabold tracking-[-0.5px]">
                            ${Number(quote.total_amount).toFixed(2)}
                        </Text>
                    </View>
                </View>

                {quote.notes ? (
                    <View className="bg-card mb-3 rounded-2xl p-4">
                        <Text className="text-foreground mb-2 text-[14px] font-bold uppercase tracking-[0.5px]">
                            Notes
                        </Text>
                        <Text className="text-muted-foreground text-[14px] leading-5">{quote.notes}</Text>
                    </View>
                ) : null}

                {(status === 'draft' || status === 'sent') && (
                    <TouchableOpacity
                        className="bg-primary mb-2 flex-row items-center justify-center gap-2 rounded-2xl p-4"
                        onPress={sendToClient}
                        activeOpacity={0.85}
                        disabled={sending}
                    >
                        {sending ? (
                            <ActivityIndicator color="#fff"/>
                        ) : (
                            <>
                                <Feather name="send" size={18} color="#fff"/>
                                <Text className="text-[16px] font-bold text-white">
                                    {status === 'sent' ? 'Resend to Client' : 'Send to Client'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    className="border border-zinc-300 mb-2 flex-row items-center justify-center gap-2 rounded-2xl p-4"
                    onPress={regeneratePDF}
                    activeOpacity={0.85}
                >
                    <Feather name="file-text" size={18} color={colors.foreground || '#111'}/>
                    <Text className="text-[15px] font-bold text-foreground">Share PDF</Text>
                </TouchableOpacity>

                {status === 'sent' && (
                    <>
                        <View className="mb-2 flex-row gap-2.5">
                            <TouchableOpacity
                                className="bg-chart-3 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl p-3.5"
                                onPress={handleAccept}
                                activeOpacity={0.85}
                            >
                                <Feather name="check" size={18} color="#fff"/>
                                <Text className="text-[15px] font-bold text-white">Mark Accepted → Job</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                            <Feather name="clock" size={20} color="#b45309"/>
                            <Text className="text-amber-800 text-[14px] font-semibold flex-1">
                                Waiting for client deposit
                            </Text>
                        </View>
                    </>
                )}

                {isPaid && (
                    <View className="flex-row items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 p-3.5">
                        <Feather name="check-circle" size={20} color="#15803d"/>
                        <Text className="text-green-800 text-[14px] font-semibold flex-1">
                            Quote accepted — deposit paid / converted to a job
                        </Text>
                    </View>
                )}

                {status === 'declined' && (
                    <View className="flex-row items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5">
                        <Feather name="x-circle" size={20} color="#b91c1c"/>
                        <Text className="text-red-800 text-[14px] font-semibold flex-1">
                            Client declined this quote
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}
