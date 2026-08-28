import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  TextInput,
} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {useAuth} from '@/context/auth-context';
import {useProfile} from '@/context/profile-context';
import {useQuote} from '@/context/quote-context';
import {
  jobsApi,
  quotesApi,
  revisionsApi,
  type Job,
  type LineItem,
  type Quote,
  type QuoteRevision,
} from '@/lib/data';
import {pdfHeaderHtml} from '@/lib/branding';
import {publicQuoteUrl} from '@/lib/config';
import * as Clipboard from 'expo-clipboard';
import {Feather} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import useThemedNavigation from '@/hooks/use-navigation-theme';

const PAID_STATUSES = ['accepted', 'approved', 'deposit_paid', 'paid'];

type EditLine = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
  isLabor: boolean;
  photo_url?: string;
};

function lineItemsToEdit(items: LineItem[]): EditLine[] {
  return (items || []).map((li, i) => ({
    key: li.id || `li-${i}`,
    description: li.description || '',
    quantity: String(li.quantity ?? 1),
    unitPrice: String(li.unitPrice ?? 0),
    isLabor: Boolean(li.isLabor),
    photo_url: li.photo_url,
  }));
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case 'revise_after_decline':
      return 'Revised after decline';
    case 'revise':
      return 'Price / scope edit';
    case 'manual_edit':
      return 'Manual edit';
    default:
      return reason.replace(/_/g, ' ');
  }
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function QuoteDetail() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const {user} = useAuth();
  const {profile} = useProfile();
  const {updateQuote, fetchJobs, fetchQuotes} = useQuote();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [linkedJob, setLinkedJob] = useState<Job | null>(null);
  const [revisions, setRevisions] = useState<QuoteRevision[]>([]);
  const [expandedRev, setExpandedRev] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revising, setRevising] = useState(false);
  const [editLines, setEditLines] = useState<EditLine[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editJobName, setEditJobName] = useState('');
  const insets = useSafeAreaInsets();
  const {colors} = useThemedNavigation();

  const loadLinkedJob = useCallback(async (quoteId: string) => {
    const result = await jobsApi.getJobByQuoteId(quoteId);
    if (result.ok) setLinkedJob(result.data);
    else setLinkedJob(null);
  }, []);

  const loadRevisions = useCallback(async (quoteId: string) => {
    const result = await revisionsApi.listRevisions(quoteId);
    if (result.ok) setRevisions(result.data);
    else setRevisions([]);
  }, []);

  const fetchQuote = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    const result = await quotesApi.getQuote(id);
    if (!result.ok) {
      Alert.alert('Error', result.error || 'Failed to load quote details');
      setQuote(null);
      setLinkedJob(null);
      setRevisions([]);
    } else {
      setQuote(result.data);
      await Promise.all([loadLinkedJob(result.data.id), loadRevisions(result.data.id)]);
    }
    setLoading(false);
  }, [id, loadLinkedJob, loadRevisions]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const editTotal = useMemo(() => {
    return editLines.reduce((sum, li) => {
      const q = parseFloat(li.quantity) || 0;
      const p = parseFloat(li.unitPrice) || 0;
      return sum + q * p;
    }, 0);
  }, [editLines]);

  const startRevise = () => {
    if (!quote) return;
    setEditLines(lineItemsToEdit(quote.quote_line_items || []));
    setEditNotes(quote.notes || '');
    setEditJobName(quote.job_name || '');
    setRevising(true);
  };

  const cancelRevise = () => {
    setRevising(false);
  };

  const saveRevision = async (thenSend: boolean) => {
    if (!quote) return;
    const cleaned = editLines
      .map((li) => ({
        description: li.description.trim(),
        quantity: Math.max(0.01, parseFloat(li.quantity) || 0),
        unit_price: Math.max(0, parseFloat(li.unitPrice) || 0),
        is_labor: li.isLabor,
        photo_url: li.photo_url ?? null,
      }))
      .filter((li) => li.description);

    if (!editJobName.trim()) {
      Alert.alert('Job name required');
      return;
    }
    if (cleaned.length === 0) {
      Alert.alert('Add at least one line item');
      return;
    }

    const total = cleaned.reduce((s, li) => s + li.quantity * li.unit_price, 0);
    const reason =
      (quote.status || '').toLowerCase() === 'declined'
        ? 'revise_after_decline'
        : 'revise';

    setBusy(true);
    try {
      const result = await quotesApi.replaceLineItems(quote.id, cleaned, total, {
        reason,
        newStatus: 'draft',
        note: thenSend ? 'Saved and sent to client' : 'Saved as draft',
      });
      if (!result.ok) throw new Error(result.error);

      await updateQuote(quote.id, {
        job_name: editJobName.trim(),
        notes: editNotes,
        status: 'draft',
        total_amount: total,
      });

      setQuote({
        ...result.data,
        job_name: editJobName.trim(),
        notes: editNotes,
        status: 'draft',
      });
      setRevising(false);
      await loadRevisions(quote.id);

      try {
        await fetchQuotes();
      } catch {
        // non-fatal
      }

      if (thenSend) {
        await sendToClientAfterRevise(result.data.id, result.data.client_name);
      } else {
        Alert.alert('Saved', 'Quote updated as draft. Revision recorded.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save revision');
    } finally {
      setBusy(false);
    }
  };

  const sendToClientAfterRevise = async (quoteId: string, clientName: string) => {
    const publicLink = publicQuoteUrl(quoteId);
    setSending(true);
    try {
      await updateQuote(quoteId, {status: 'sent'});
      setQuote((prev) => (prev ? {...prev, status: 'sent'} : prev));
      await Clipboard.setStringAsync(publicLink);
      try {
        await Share.share({
          message: `Here's your updated FixBid quote: ${publicLink}`,
          url: publicLink,
          title: `Updated quote for ${clientName}`,
        });
      } catch {
        // dismissed
      }
      Alert.alert('Sent', 'Revised quote marked as Sent. Link is on the clipboard.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not send');
    } finally {
      setSending(false);
    }
  };

  const sendToClient = async () => {
    if (!quote) return;

    const publicLink = publicQuoteUrl(quote.id);
    setSending(true);

    try {
      await updateQuote(quote.id, {status: 'sent'});
      setQuote((prev) => (prev ? {...prev, status: 'sent'} : prev));

      await Clipboard.setStringAsync(publicLink);

      try {
        await Share.share({
          message: `Here's your quote: ${publicLink}`,
          url: publicLink,
          title: `Quote for ${quote.client_name}`,
        });
      } catch {
        // dismissed
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

  const convertToJob = async (opts?: {silentIfExists?: boolean}) => {
    if (!quote) return;

    if (linkedJob) {
      if (opts?.silentIfExists) return;
      Alert.alert('Job already exists', 'Open the job for this quote?', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Open job', onPress: () => router.push(`/job/${linkedJob.id}`)},
      ]);
      return;
    }

    if (!user?.id) {
      Alert.alert('Not logged in');
      return;
    }

    setBusy(true);
    try {
      const existing = await jobsApi.getJobByQuoteId(quote.id);
      if (existing.ok && existing.data) {
        setLinkedJob(existing.data);
        Alert.alert('Job ready', 'A job was already created for this quote.', [
          {text: 'OK'},
          {text: 'Open job', onPress: () => router.push(`/job/${existing.data!.id}`)},
        ]);
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
        before_photos: quote.photos || [],
        after_photos: [],
        payments: [],
        status: 'schedule',
        notes: quote.notes || null,
      });

      if (!jobResult.ok) throw new Error(jobResult.error);

      if (!PAID_STATUSES.includes((quote.status || '').toLowerCase())) {
        await updateQuote(quote.id, {status: 'accepted'});
        setQuote((prev) => (prev ? {...prev, status: 'accepted'} : prev));
      }

      setLinkedJob(jobResult.data);

      try {
        await fetchJobs();
      } catch {
        // non-fatal
      }

      Alert.alert('Job created', 'Quote converted to a job. Schedule it when ready.', [
        {text: 'Stay here'},
        {text: 'Open job', onPress: () => router.push(`/job/${jobResult.data.id}`)},
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to create job');
    } finally {
      setBusy(false);
    }
  };

  const handleManualAccept = () => {
    Alert.alert(
      'Accept quote',
      'Mark this quote as accepted and create a job? (Client deposit will still be tracked separately if paid later.)',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Create job', onPress: () => convertToJob()},
      ],
    );
  };

  const regeneratePDF = async () => {
    if (!quote) return;

    const lineItems = quote.quote_line_items || [];
    const header = pdfHeaderHtml(profile);

    const htmlContent = `
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
                    h1 { color: #1e40af; text-align: center; margin-bottom: 4px; }
                    .header { text-align: center; margin-bottom: 28px; }
                    .meta { color: #555; font-size: 14px; margin: 2px 0; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #f1f5f9; }
                    .photo { max-width: 300px; border-radius: 8px; margin: 10px 0; }
                    .total { font-size: 26px; font-weight: bold; color: #15803d; text-align: right; }
                  </style>
                </head>
                <body>
                  ${header}
                  <p class="meta">Date: ${new Date().toLocaleDateString()}</p>
                  <p class="meta"><strong>Job:</strong> ${quote.job_name || ''}</p>

                  <h2>Client: ${quote.client_name}</h2>
                  ${quote.client_phone ? `<p>Phone: ${quote.client_phone}</p>` : ''}

                  <table>
                    <thead>
                      <tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                      ${lineItems
                        .map(
                          (item) => `
                        <tr>
                          <td>${item.description}</td>
                          <td>${item.quantity}</td>
                          <td>$${Number(item.unitPrice).toFixed(2)}</td>
                          <td>$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                        ${item.photo_url ? `<tr><td colspan="4"><img src="${item.photo_url}" class="photo" /></td></tr>` : ''}
                      `,
                        )
                        .join('')}
                    </tbody>
                  </table>

                  <div class="total">Total: $${Number(quote.total_amount).toFixed(2)}</div>
                  ${quote.notes ? `<p><strong>Notes:</strong><br>${quote.notes}</p>` : ''}
                  ${profile?.payment_note ? `<p style="margin-top:24px;color:#555;font-size:13px;">${profile.payment_note}</p>` : ''}
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
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!quote) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
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
      <View className="flex-row items-center gap-3 px-4 pb-3" style={{paddingTop: insets.top + 12}}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground || '#111'} />
        </TouchableOpacity>

        <Text className="text-foreground flex-1 text-[17px] font-bold" numberOfLines={1}>
          {quote.job_name}
        </Text>

        <View
          className={`mt-2 self-end rounded-full px-4 py-1 ${
            isPaid
              ? 'bg-green-100'
              : status === 'declined'
                ? 'bg-red-100'
                : 'bg-amber-100'
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

      <ScrollView contentContainerClassName="px-4 pb-28" keyboardShouldPersistTaps="handled">
        <View className="mb-4 rounded-[20px] bg-secondary-foreground p-6">
          <Text className="text-[11px] font-bold uppercase tracking-[1px] text-slate-400">QUOTE</Text>
          <Text className="text-[42px] font-black tracking-[-1px] text-white">
            ${Number(revising ? editTotal : quote.total_amount).toLocaleString()}
          </Text>
          <Text className="mt-1 text-[16px] text-slate-400">{quote.client_name}</Text>
          <Text className="text-[13px] text-slate-400">{quote.client_phone}</Text>
          <Text className="mt-1 text-[13px] text-slate-500">{formatDate(quote.created_at)}</Text>
          <Text className="mt-3 text-[13px] text-slate-400">50% deposit: ${deposit.toFixed(2)}</Text>
          {revisions.length > 0 ? (
            <Text className="mt-2 text-[12px] text-slate-500">
              {revisions.length} revision{revisions.length === 1 ? '' : 's'} recorded
            </Text>
          ) : null}
        </View>

        {revising ? (
          <View className="mb-3 gap-3">
            <View className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
              <Text className="text-[14px] font-semibold text-amber-900">
                Adjust pricing or scope, then save as draft or send again. Previous totals are kept in
                revision history.
              </Text>
            </View>

            <View className="gap-1">
              <Text className="text-muted-foreground text-xs font-bold uppercase">Job name</Text>
              <TextInput
                className="rounded-xl border border-zinc-300 bg-card px-3 py-2.5 text-[15px] text-foreground"
                value={editJobName}
                onChangeText={setEditJobName}
              />
            </View>

            <Text className="text-foreground text-[14px] font-bold uppercase tracking-[0.5px]">
              Line items
            </Text>
            {editLines.map((li, idx) => (
              <View key={li.key} className="gap-2 rounded-xl border border-zinc-300 bg-card p-3">
                <TextInput
                  className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm font-semibold text-foreground"
                  value={li.description}
                  onChangeText={(v) =>
                    setEditLines((rows) =>
                      rows.map((r, i) => (i === idx ? {...r, description: v} : r)),
                    )
                  }
                  placeholder="Description"
                />
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="w-14 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm text-foreground"
                    value={li.quantity}
                    onChangeText={(v) =>
                      setEditLines((rows) =>
                        rows.map((r, i) => (i === idx ? {...r, quantity: v} : r)),
                      )
                    }
                    keyboardType="decimal-pad"
                    placeholder="Qty"
                  />
                  <Text className="text-muted-foreground">×</Text>
                  <TextInput
                    className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-foreground"
                    value={li.unitPrice}
                    onChangeText={(v) =>
                      setEditLines((rows) =>
                        rows.map((r, i) => (i === idx ? {...r, unitPrice: v} : r)),
                      )
                    }
                    keyboardType="decimal-pad"
                    placeholder="Price"
                  />
                  <TouchableOpacity
                    onPress={() => setEditLines((rows) => rows.filter((_, i) => i !== idx))}
                  >
                    <Feather name="trash-2" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 p-3"
              onPress={() =>
                setEditLines((rows) => [
                  ...rows,
                  {
                    key: `new-${Date.now()}`,
                    description: '',
                    quantity: '1',
                    unitPrice: '0',
                    isLabor: false,
                  },
                ])
              }
            >
              <Feather name="plus" size={16} color={colors.primary || '#f97316'} />
              <Text className="text-primary text-sm font-semibold">Add line item</Text>
            </TouchableOpacity>

            <View className="gap-1">
              <Text className="text-muted-foreground text-xs font-bold uppercase">Notes</Text>
              <TextInput
                className="min-h-[80px] rounded-xl border border-zinc-300 bg-card px-3 py-2.5 text-[14px] text-foreground"
                style={{textAlignVertical: 'top'}}
                multiline
                value={editNotes}
                onChangeText={setEditNotes}
              />
            </View>

            <View className="flex-row items-center justify-between rounded-xl bg-card p-3">
              <Text className="text-muted-foreground font-semibold">New total</Text>
              <Text className="text-primary text-xl font-extrabold">${editTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary p-4"
              onPress={() => saveRevision(true)}
              disabled={busy || sending}
            >
              {busy || sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#fff" />
                  <Text className="text-base font-bold text-white">Save & send to client</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-zinc-300 p-4"
              onPress={() => saveRevision(false)}
              disabled={busy}
            >
              <Text className="text-foreground text-base font-bold">Save as draft only</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center py-2" onPress={cancelRevise} disabled={busy}>
              <Text className="text-muted-foreground font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
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
                    <Text className="text-foreground text-[14px] font-semibold">{li.description}</Text>
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
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={18} color="#fff" />
                    <Text className="text-[16px] font-bold text-white">
                      {status === 'sent' ? 'Resend to Client' : 'Send to Client'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="mb-2 flex-row items-center justify-center gap-2 rounded-2xl border border-zinc-300 p-4"
              onPress={regeneratePDF}
              activeOpacity={0.85}
            >
              <Feather name="file-text" size={18} color={colors.foreground || '#111'} />
              <Text className="text-foreground text-[15px] font-bold">Share PDF</Text>
            </TouchableOpacity>

            {status === 'sent' && (
              <>
                <TouchableOpacity
                  className="mb-2 flex-row items-center justify-center gap-2 rounded-2xl bg-emerald-600 p-4"
                  onPress={handleManualAccept}
                  activeOpacity={0.85}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="briefcase" size={18} color="#fff" />
                      <Text className="text-[15px] font-bold text-white">Accept & create job</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View className="mb-2 flex-row items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                  <Feather name="clock" size={20} color="#b45309" />
                  <Text className="flex-1 text-[14px] font-semibold text-amber-800">
                    Waiting for client deposit — payment also creates a job automatically.
                  </Text>
                </View>
              </>
            )}

            {isPaid && (
              <View className="mb-2 gap-2">
                <View className="flex-row items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 p-3.5">
                  <Feather name="check-circle" size={20} color="#15803d" />
                  <Text className="flex-1 text-[14px] font-semibold text-green-800">
                    Quote accepted{linkedJob ? ' — job is ready' : ' — convert to a job when ready'}
                  </Text>
                </View>

                {linkedJob ? (
                  <TouchableOpacity
                    className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary p-4"
                    onPress={() => router.push(`/job/${linkedJob.id}`)}
                  >
                    <Feather name="briefcase" size={18} color="#fff" />
                    <Text className="text-base font-bold text-white">Open job</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary p-4"
                    onPress={() => convertToJob()}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Feather name="plus-circle" size={18} color="#fff" />
                        <Text className="text-base font-bold text-white">Turn into a job</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {status === 'declined' && (
              <View className="mb-2 gap-2">
                <View className="flex-row items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5">
                  <Feather name="x-circle" size={20} color="#b91c1c" />
                  <Text className="flex-1 text-[14px] font-semibold text-red-800">
                    Client declined this quote. Adjust the price or scope and send it again.
                  </Text>
                </View>

                <TouchableOpacity
                  className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary p-4"
                  onPress={startRevise}
                >
                  <Feather name="edit-3" size={18} color="#fff" />
                  <Text className="text-base font-bold text-white">Revise & resend</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Revision history */}
            <View className="bg-card mb-4 mt-2 rounded-2xl p-4">
              <Text className="text-foreground mb-3 text-[14px] font-bold uppercase tracking-[0.5px]">
                Revision history
              </Text>
              {revisions.length === 0 ? (
                <Text className="text-muted-foreground text-[13px]">
                  No revisions yet. History appears when you revise pricing or scope.
                </Text>
              ) : (
                revisions.map((rev) => {
                  const open = expandedRev === rev.id;
                  const delta =
                    rev.previous_total != null && rev.new_total != null
                      ? rev.new_total - rev.previous_total
                      : null;
                  return (
                    <TouchableOpacity
                      key={rev.id}
                      className="mb-2 rounded-xl border border-zinc-200 p-3"
                      activeOpacity={0.85}
                      onPress={() => setExpandedRev(open ? null : rev.id)}
                    >
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1">
                          <Text className="text-foreground text-[14px] font-bold">
                            Rev #{rev.revision_number} · {reasonLabel(rev.reason)}
                          </Text>
                          <Text className="text-muted-foreground mt-0.5 text-[12px]">
                            {formatDateTime(rev.created_at)}
                          </Text>
                        </View>
                        <Feather
                          name={open ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={colors.mutedForeground || '#94a3b8'}
                        />
                      </View>

                      <Text className="text-foreground mt-2 text-[13px]">
                        {rev.previous_total != null
                          ? `$${Number(rev.previous_total).toFixed(2)}`
                          : '—'}
                        {' → '}
                        {rev.new_total != null
                          ? `$${Number(rev.new_total).toFixed(2)}`
                          : '—'}
                        {delta != null ? (
                          <Text
                            className={
                              delta < 0
                                ? ' text-green-600'
                                : delta > 0
                                  ? ' text-amber-700'
                                  : ' text-muted-foreground'
                            }
                          >
                            {` (${delta > 0 ? '+' : ''}$${delta.toFixed(2)})`}
                          </Text>
                        ) : null}
                      </Text>

                      {(rev.previous_status || rev.new_status) && (
                        <Text className="text-muted-foreground mt-1 text-[12px] capitalize">
                          Status: {rev.previous_status || '—'} → {rev.new_status || '—'}
                        </Text>
                      )}

                      {open && (
                        <View className="mt-3 border-t border-zinc-100 pt-3">
                          <Text className="text-muted-foreground mb-1 text-[11px] font-bold uppercase">
                            Snapshot before change
                          </Text>
                          <Text className="text-foreground text-[13px] font-semibold">
                            {rev.snapshot?.job_name || '—'}
                          </Text>
                          {(rev.snapshot?.line_items || []).map((li, i) => (
                            <Text key={i} className="text-muted-foreground mt-1 text-[12px]">
                              {li.description} · {li.quantity} × ${
                                Number(li.unit_price).toFixed(2)
                              }
                            </Text>
                          ))}
                          {rev.note ? (
                            <Text className="text-muted-foreground mt-2 text-[12px] italic">
                              {rev.note}
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
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
