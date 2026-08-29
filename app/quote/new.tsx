import React, {useRef, useState} from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import {useRouter} from 'expo-router';
import {useAuth} from '@/context/auth-context';
import {useProfile} from '@/context/profile-context';
import {useQuote} from '@/context/quote-context';
import {quotesApi, type DraftLineItem} from '@/lib/data';
import {estimateFromVoice, estimateJobCost, estimateToDraftLineItems} from '@/lib/ai-estimate';
import {startVoiceCapture} from '@/lib/voice-record';
import {Feather} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {notifyError, notifyInfo, notifySuccess, notifyWarning} from '@/lib/feedback';
import {useNewQuoteDraft} from '@/hooks/use-new-quote-draft';

export default function NewQuoteScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {user} = useAuth();
    const {profile} = useProfile();
    const {clients, fetchQuotes} = useQuote();
    const draft = useNewQuoteDraft();

    const [saving, setSaving] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [voiceListening, setVoiceListening] = useState(false);
    const voiceHandleRef = useRef<Awaited<ReturnType<typeof startVoiceCapture>> | null>(null);

    const hourlyRate =
        profile?.hourly_rate && Number(profile.hourly_rate) > 0
            ? Number(profile.hourly_rate)
            : undefined;

    const total = draft.lineItems.reduce(
        (s, li) => s + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
        0,
    );

    const toggleVoiceToQuote = async () => {
        if (voiceListening && voiceHandleRef.current) {
            setVoiceListening(false);
            setEstimating(true);
            try {
                const captured = await voiceHandleRef.current.stopAndGetResult();
                voiceHandleRef.current = null;
                const region = [profile?.city, profile?.state].filter(Boolean).join(', ');
                const estimate = await estimateFromVoice({
                    audioBase64: captured.audioBase64,
                    audioMime: captured.audioMime,
                    transcript: captured.transcript,
                    hourlyRate,
                    region: region || undefined,
                });
                const lines = estimateToDraftLineItems(estimate);
                if (!lines.length) {
                    notifyWarning('No line items', 'Speak more about labor, materials, and scope.');
                    return;
                }
                const noteParts = [estimate.notes, estimate.summary].filter(Boolean);
                draft.applyTemplateDraft({
                    jobName: estimate.job_name || draft.jobName,
                    totalAmount: estimate.suggested,
                    notes: noteParts.join('\n') || draft.notes,
                    lineItems: lines,
                });
                notifySuccess('Voice quote ready', `${lines.length} items · $${estimate.suggested}`);
            } catch (e: any) {
                notifyError('Voice-to-quote failed', e?.message || 'Try again');
            } finally {
                setEstimating(false);
            }
            return;
        }
        try {
            voiceHandleRef.current = await startVoiceCapture();
            setVoiceListening(true);
            notifyInfo('Listening…', 'Talk through the job, then tap Stop.');
        } catch (e: any) {
            notifyError('Microphone', e?.message || 'Could not start recording');
        }
    };

    const runAiEstimate = async () => {
        if (!draft.jobName.trim()) {
            notifyWarning('Need input', 'Add a short job description first.');
            return;
        }
        setEstimating(true);
        try {
            const region = [profile?.city, profile?.state].filter(Boolean).join(', ');
            const estimate = await estimateJobCost({
                description: draft.jobName.trim(),
                hourlyRate,
                region: region || undefined,
            });
            draft.applyTemplateDraft({
                jobName: estimate.job_name || draft.jobName,
                totalAmount: estimate.suggested,
                notes: estimate.notes || draft.notes,
                lineItems: estimateToDraftLineItems(estimate),
            });
            notifySuccess('AI estimate applied', `$${estimate.suggested}`);
        } catch (e: any) {
            notifyError('AI estimate failed', e?.message || 'Try voice or manual lines');
        } finally {
            setEstimating(false);
        }
    };

    const saveQuote = async (status: 'draft' | 'sent') => {
        if (!user?.id) {
            notifyError('Not logged in');
            return;
        }
        if (!draft.jobName.trim() || draft.lineItems.length === 0) {
            notifyWarning('Missing info', 'Job name and at least one line item required');
            return;
        }
        setSaving(true);
        try {
            const clientName =
                draft.clientName.trim() ||
                clients.find((c) => c.id === draft.selectedClientId)?.name ||
                'Client';
            const result = await quotesApi.createQuote({
                handyman_id: user.id,
                client_name: clientName,
                client_id: draft.selectedClientId || null,
                client_phone: draft.clientPhone || null,
                job_name: draft.jobName.trim(),
                notes: draft.notes || null,
                total_amount: total,
                status,
                photos: draft.photos || [],
                line_items: draft.lineItems.map((li) => ({
                    description: li.description,
                    quantity: Number(li.quantity) || 1,
                    unit_price: Number(li.unitPrice) || 0,
                    is_labor: !!li.isLabor,
                })),
            });
            if (!result.ok) throw new Error(result.error);
            await fetchQuotes();
            notifySuccess(status === 'sent' ? 'Quote sent' : 'Draft saved');
            draft.reset();
            router.replace(`/quote/${result.data.id}`);
        } catch (e: any) {
            notifyError('Save failed', e?.message || 'Could not save quote');
        } finally {
            setSaving(false);
        }
    };

    const updateLine = (index: number, patch: Partial<DraftLineItem>) => {
        draft.setLineItems(
            draft.lineItems.map((li, i) => (i === index ? {...li, ...patch} : li)),
        );
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-background"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View className="flex-row items-center gap-3 px-4 pb-3" style={{paddingTop: insets.top + 12}}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Feather name="arrow-left" size={22} color="#111" />
                </TouchableOpacity>
                <Text className="flex-1 text-[17px] font-bold text-foreground">New quote</Text>
                <Text className="text-[15px] font-extrabold text-primary">${total.toFixed(0)}</Text>
            </View>

            <ScrollView className="flex-1 px-4" contentContainerStyle={{paddingBottom: 140}} keyboardShouldPersistTaps="handled">
                <Text className="mb-2 text-xs font-bold uppercase text-muted-foreground">Job name</Text>
                <TextInput
                    className="mb-4 rounded-xl border border-zinc-300 bg-card px-3 py-3 text-[15px] text-foreground"
                    placeholder="e.g. Guest bath faucet + drywall patch"
                    value={draft.jobName}
                    onChangeText={draft.setJobName}
                />

                <Text className="mb-2 text-xs font-bold uppercase text-muted-foreground">Client</Text>
                <TextInput
                    className="mb-4 rounded-xl border border-zinc-300 bg-card px-3 py-3 text-[15px] text-foreground"
                    placeholder="Client name"
                    value={draft.clientName}
                    onChangeText={draft.setClientName}
                />

                <TouchableOpacity
                    className={`mb-3 flex-row items-center justify-center gap-2 rounded-2xl p-4 ${
                        voiceListening ? 'bg-red-600' : 'border border-orange-300 bg-orange-50'
                    }`}
                    onPress={toggleVoiceToQuote}
                    disabled={estimating && !voiceListening}
                    activeOpacity={0.85}
                >
                    {estimating && !voiceListening ? (
                        <ActivityIndicator color="#ea580c" />
                    ) : (
                        <>
                            <Feather name={voiceListening ? 'stop-circle' : 'mic'} size={20} color={voiceListening ? '#fff' : '#ea580c'} />
                            <Text className={`text-base font-bold ${voiceListening ? 'text-white' : 'text-orange-700'}`}>
                                {voiceListening ? 'Stop & build quote' : 'Voice-to-quote'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    className="mb-4 flex-row items-center justify-center gap-2 rounded-2xl bg-primary p-4"
                    onPress={runAiEstimate}
                    disabled={estimating || voiceListening}
                    activeOpacity={0.85}
                >
                    {estimating && !voiceListening ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Feather name="cpu" size={18} color="#fff" />
                            <Text className="text-base font-bold text-white">AI estimate from description</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text className="mb-2 text-xs font-bold uppercase text-muted-foreground">Line items</Text>
                {draft.lineItems.length === 0 ? (
                    <Text className="mb-3 text-[13px] text-muted-foreground">
                        Talk through the job or run AI estimate to fill lines.
                    </Text>
                ) : (
                    draft.lineItems.map((li, idx) => (
                        <View key={idx} className="mb-2 rounded-xl border border-zinc-200 bg-card p-3">
                            <TextInput
                                className="mb-1 text-[14px] font-semibold text-foreground"
                                value={li.description}
                                onChangeText={(v) => updateLine(idx, {description: v})}
                            />
                            <View className="flex-row items-center gap-2">
                                <TextInput
                                    className="flex-1 rounded-lg border border-zinc-200 px-2 py-1 text-sm text-foreground"
                                    value={String(li.quantity)}
                                    keyboardType="decimal-pad"
                                    onChangeText={(v) => updateLine(idx, {quantity: Number(v) || 0})}
                                />
                                <Text className="text-muted-foreground">×</Text>
                                <TextInput
                                    className="flex-1 rounded-lg border border-zinc-200 px-2 py-1 text-sm text-foreground"
                                    value={String(li.unitPrice)}
                                    keyboardType="decimal-pad"
                                    onChangeText={(v) => updateLine(idx, {unitPrice: Number(v) || 0})}
                                />
                                <Text className="w-16 text-right text-sm font-bold text-foreground">
                                    ${((Number(li.quantity) || 0) * (Number(li.unitPrice) || 0)).toFixed(0)}
                                </Text>
                            </View>
                        </View>
                    ))
                )}

                <TouchableOpacity
                    className="mb-4 flex-row items-center gap-2 py-2"
                    onPress={() =>
                        draft.setLineItems([
                            ...draft.lineItems,
                            {description: '', quantity: 1, unitPrice: 0, isLabor: false},
                        ])
                    }
                >
                    <Feather name="plus" size={16} color="#f97316" />
                    <Text className="font-semibold text-primary">Add line</Text>
                </TouchableOpacity>

                <Text className="mb-2 text-xs font-bold uppercase text-muted-foreground">Notes</Text>
                <TextInput
                    className="mb-6 min-h-[88px] rounded-xl border border-zinc-300 bg-card px-3 py-3 text-[14px] text-foreground"
                    style={{textAlignVertical: 'top'}}
                    multiline
                    placeholder="Scope notes from your walkthrough appear here"
                    value={draft.notes}
                    onChangeText={draft.setNotes}
                />
            </ScrollView>

            <View
                className="absolute bottom-0 left-0 right-0 flex-row gap-2 border-t border-zinc-200 bg-background px-4 pt-3"
                style={{paddingBottom: Math.max(insets.bottom, 12)}}
            >
                <TouchableOpacity
                    className="flex-1 items-center rounded-2xl border border-zinc-300 py-3.5"
                    onPress={() => saveQuote('draft')}
                    disabled={saving}
                >
                    <Text className="font-bold text-foreground">Save draft</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-1 items-center rounded-2xl bg-primary py-3.5"
                    onPress={() => saveQuote('sent')}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="font-bold text-white">Save & send</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
