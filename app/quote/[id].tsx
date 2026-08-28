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
import {Button, Card, CardTitle, HeroCard, StatusBadge} from '@/components/ui';

const PAID_STATUSES = ['accepted', 'approved', 'deposit_paid', 'paid'];

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

export default function QuoteDetailScreen() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {colors} = useThemedNavigation();
  const {user} = useAuth();
  const {profile} = useProfile();
  const {updateQuote, refreshAll} = useQuote();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [revising, setRevising] = useState(false);
  const [linkedJob, setLinkedJob] = useState<Job | null>(null);
  const [revisions, setRevisions] = useState<QuoteRevision[]>([]);
  const [expandedRev, setExpandedRev] = useState<string | null>(null);

  const [editJobName, setEditJobName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLines, setEditLines] = useState<
    Array<{key: string; description: string; quantity: string; unitPrice: string; isLabor: boolean}>
  >([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await quotesApi.getQuote(String(id));
      if (!res.ok) {
        setQuote(null);
        return;
      }
      setQuote(res.data);
      setEditJobName(res.data.job_name || '');
      setEditNotes(res.data.notes || '');
      setEditLines(
        (res.data.quote_line_items || []).map((li, i) => ({
          key: li.id || `li-${i}`,
          description: li.description,
          quantity: String(li.quantity),
          unitPrice: String(li.unitPrice),
          isLabor: li.isLabor,
        })),
      );
      const jobRes = await jobsApi.getJobByQuoteId(String(id));
      setLinkedJob(jobRes.ok ? jobRes.data : null);
      const revRes = await revisionsApi.listRevisions(String(id));
      setRevisions(revRes.ok ? revRes.data : []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const editTotal = useMemo(() => {
    return editLines.reduce((sum, li) => {
      return sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0);
    }, 0);
  }, [editLines]);

  const shareLink = async () => {
    if (!quote) return;
    const url = publicQuoteUrl(quote.id);
    try {
      await Share.share({message: url, url});
    } catch {
      await Clipboard.setStringAsync(url);
      Alert.alert('Link copied', url);
    }
  };

  const convertToJob = async () => {
    if (!quote || !user?.id) return;
    setBusy(true);
    try {
      if ((quote.status || '').toLowerCase() === 'sent') {
        await updateQuote(quote.id, {status: 'accepted'});
        setQuote((prev) => (prev ? {...prev, status: 'accepted'} : prev));
      }
      const jobResult = await jobsApi.createJobFromQuote(quote, user.id);
      if (!jobResult.ok) throw new Error(jobResult.error);
      setLinkedJob(jobResult.data);
      await refreshAll();
      Alert.alert('Job created', 'Open the job now?', [
        {text: 'Stay here'},
        {text: 'Open job', onPress: () => router.push(`/job/${jobResult.data.id}`)},
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create job');
    } finally {
      setBusy(false);
    }
  };

  const startRevise = () => setRevising(true);

  const saveRevision = async (send: boolean) => {
    if (!quote) return;
    if (!editJobName.trim()) {
      Alert.alert('Job name required');
      return;
    }
    setBusy(true);
    if (send) setSending(true);
    try {
      const items = editLines
        .filter((li) => li.description.trim())
        .map((li) => ({
          description: li.description.trim(),
          quantity: Number(li.quantity) || 0,
          unit_price: Number(li.unitPrice) || 0,
          is_labor: li.isLabor,
        }));
      const total = items.reduce((s, li) => s + li.quantity * li.unit_price, 0);
      const res = await quotesApi.replaceLineItems(quote.id, items, total, {
        reason: 'revise',
        newStatus: send ? 'sent' : 'draft',
        note: editNotes,
      });
      if (!res.ok) throw new Error(res.error);
      await quotesApi.updateQuote(quote.id, {
        job_name: editJobName.trim(),
        notes: editNotes,
      });
      setRevising(false);
      await load();
      await refreshAll();
      Alert.alert(send ? 'Sent' : 'Saved', send ? 'Updated quote sent to client.' : 'Draft saved.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save');
    } finally {
      setBusy(false);
      setSending(false);
    }
  };

  const regeneratePDF = async () => {
    if (!quote) return;
    const header = pdfHeaderHtml(profile);
    const htmlContent = `<html><body>${header}<h2>${quote.client_name}</h2><p>Total: $${Number(quote.total_amount).toFixed(2)}</p></body></html>`;
    try {
      const {uri} = await Print.printToFileAsync({html: htmlContent});
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!quote) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-foreground">Quote not found</Text>
      </View>
    );
  }

  const status = (quote.status || 'draft').toLowerCase();
  const isPaid = PAID_STATUSES.includes(status);
  const depositPct =
    quote.deposit_percent != null && Number(quote.deposit_percent) > 0
      ? Number(quote.deposit_percent)
      : 50;
  const deposit = Math.round(Number(quote.total_amount) * (depositPct / 100) * 100) / 100;
  const acceptMode = quote.acceptance_mode === 'accept' ? 'accept' : 'deposit';
  const lineItems = quote.quote_line_items || [];

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 pb-3" style={{paddingTop: insets.top + 12}}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground || '#111'} />
        </TouchableOpacity>
        <Text className="flex-1 text-[17px] font-bold text-foreground" numberOfLines={1}>
          {quote.job_name}
        </Text>
        <StatusBadge status={quote.status} />
      </View>

      <ScrollView contentContainerClassName="gap-3 px-4 pb-28" keyboardShouldPersistTaps="handled">
        <HeroCard className="p-6">
          <Text className="text-[11px] font-bold uppercase tracking-[1px] text-slate-400">QUOTE</Text>
          <Text className="text-[42px] font-black tracking-[-1px] text-white">
            ${Number(revising ? editTotal : quote.total_amount).toLocaleString()}
          </Text>
          <Text className="mt-1 text-[16px] text-slate-400">{quote.client_name}</Text>
          {quote.client_phone ? (
            <Text className="text-[13px] text-slate-400">{quote.client_phone}</Text>
          ) : null}
          <Text className="mt-1 text-[13px] text-slate-500">{formatDate(quote.created_at)}</Text>
          {acceptMode === 'deposit' ? (
            <Text className="mt-3 text-[13px] text-slate-400">
              {depositPct}% deposit: ${deposit.toFixed(2)}
            </Text>
          ) : (
            <Text className="mt-3 text-[13px] text-emerald-400">
              Accept without payment (e-sign)
            </Text>
          )}
        </HeroCard>

        {!revising ? (
          <>
            <Card>
              <CardTitle>Line Items</CardTitle>
              {lineItems.map((li) => (
                <View key={li.id} className="mb-2 flex-row justify-between gap-2">
                  <Text className="flex-1 text-[14px] text-foreground">{li.description}</Text>
                  <Text className="text-[14px] font-semibold text-foreground">
                    ${(li.quantity * li.unitPrice).toFixed(2)}
                  </Text>
                </View>
              ))}
            </Card>

            {quote.notes ? (
              <Card>
                <CardTitle>Notes</CardTitle>
                <Text className="text-[14px] text-foreground">{quote.notes}</Text>
              </Card>
            ) : null}

            <View className="flex-row gap-2">
              <Button className="flex-1" icon="link" title="Share link" onPress={shareLink} />
              <Button className="flex-1" variant="outline" icon="file-text" title="PDF" onPress={regeneratePDF} />
            </View>

            {(status === 'draft' || status === 'sent') && (
              <Card>
                <CardTitle>Client acceptance</CardTitle>
                <Text className="mb-3 text-[13px] text-muted-foreground">
                  Choose how the client locks in this quote on the public link.
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        setBusy(true);
                        await updateQuote(quote.id, {acceptance_mode: 'deposit'});
                        setQuote((prev) => (prev ? {...prev, acceptance_mode: 'deposit'} : prev));
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Could not update');
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className={`flex-1 rounded-xl border px-3 py-3 ${
                      acceptMode === 'deposit'
                        ? 'border-primary bg-primary/10'
                        : 'border-zinc-200 bg-card'
                    }`}
                  >
                    <Text className="text-center text-[13px] font-bold text-foreground">Deposit required</Text>
                    <Text className="mt-1 text-center text-[11px] text-muted-foreground">
                      Client pays {depositPct}% to accept
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        setBusy(true);
                        await updateQuote(quote.id, {acceptance_mode: 'accept'});
                        setQuote((prev) => (prev ? {...prev, acceptance_mode: 'accept'} : prev));
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Could not update');
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className={`flex-1 rounded-xl border px-3 py-3 ${
                      acceptMode === 'accept'
                        ? 'border-primary bg-primary/10'
                        : 'border-zinc-200 bg-card'
                    }`}
                  >
                    <Text className="text-center text-[13px] font-bold text-foreground">E-sign / accept</Text>
                    <Text className="mt-1 text-center text-[11px] text-muted-foreground">
                      Accept without paying now
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {status === 'sent' && (
              <>
                <Button
                  variant="success"
                  icon="briefcase"
                  loading={busy}
                  title="Accept & create job"
                  onPress={() =>
                    Alert.alert('Accept quote', 'Mark accepted and create a job?', [
                      {text: 'Cancel', style: 'cancel'},
                      {text: 'Create job', onPress: convertToJob},
                    ])
                  }
                />
                <Card className="border border-amber-200 bg-amber-50">
                  <Text className="text-[14px] font-semibold text-amber-800">
                    {acceptMode === 'deposit'
                      ? 'Waiting for client deposit — payment also creates a job automatically.'
                      : 'Waiting for client to accept (e-sign) on the public link — no deposit required.'}
                  </Text>
                </Card>
              </>
            )}

            {isPaid && (
              <View className="gap-2">
                <Card className="border border-green-200 bg-green-50">
                  <Text className="text-[14px] font-semibold text-green-800">
                    Quote accepted{linkedJob ? ' — job is ready' : ' — convert to a job when ready'}
                  </Text>
                </Card>
                {linkedJob ? (
                  <Button icon="briefcase" title="Open job" onPress={() => router.push(`/job/${linkedJob.id}`)} />
                ) : (
                  <Button icon="plus-circle" loading={busy} title="Turn into a job" onPress={convertToJob} />
                )}
              </View>
            )}

            {status === 'declined' && (
              <View className="gap-2">
                <Card className="border border-red-200 bg-red-50">
                  <Text className="text-[14px] font-semibold text-red-800">
                    Client declined this quote. Adjust the price or scope and send it again.
                  </Text>
                </Card>
                <Button icon="edit-3" title="Revise & resend" onPress={startRevise} />
              </View>
            )}

            <Card>
              <CardTitle>Revision history</CardTitle>
              {revisions.length === 0 ? (
                <Text className="text-[13px] text-muted-foreground">
                  No revisions yet. History appears when you revise pricing or scope.
                </Text>
              ) : (
                revisions.map((rev) => {
                  const open = expandedRev === rev.id;
                  return (
                    <TouchableOpacity
                      key={rev.id}
                      onPress={() => setExpandedRev(open ? null : rev.id)}
                      className="mb-2 rounded-xl border border-zinc-200 p-3"
                    >
                      <Text className="text-[13px] font-semibold text-foreground">
                        Rev #{rev.revision_number} · {formatDate(rev.created_at)}
                      </Text>
                      {open ? (
                        <Text className="mt-1 text-[12px] text-muted-foreground">
                          {rev.previous_total} → {rev.new_total}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </Card>
          </>
        ) : (
          <View className="gap-3">
            <Card className="border border-amber-200 bg-amber-50">
              <Text className="text-[14px] font-semibold text-amber-900">
                Adjust pricing or scope, then save as draft or send again.
              </Text>
            </Card>
            <View className="gap-1">
              <Text className="text-xs font-bold uppercase text-muted-foreground">Job name</Text>
              <TextInput
                className="rounded-xl border border-zinc-300 bg-card px-3 py-2.5 text-[15px] text-foreground"
                value={editJobName}
                onChangeText={setEditJobName}
              />
            </View>
            {editLines.map((li, idx) => (
              <View key={li.key} className="gap-2 rounded-xl border border-zinc-300 bg-card p-3">
                <TextInput
                  className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm font-semibold text-foreground"
                  value={li.description}
                  onChangeText={(v) =>
                    setEditLines((rows) => rows.map((r, i) => (i === idx ? {...r, description: v} : r)))
                  }
                />
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-foreground"
                    value={li.quantity}
                    onChangeText={(v) =>
                      setEditLines((rows) => rows.map((r, i) => (i === idx ? {...r, quantity: v} : r)))
                    }
                    keyboardType="decimal-pad"
                  />
                  <Text className="text-muted-foreground">×</Text>
                  <TextInput
                    className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-foreground"
                    value={li.unitPrice}
                    onChangeText={(v) =>
                      setEditLines((rows) => rows.map((r, i) => (i === idx ? {...r, unitPrice: v} : r)))
                    }
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity onPress={() => setEditLines((rows) => rows.filter((_, i) => i !== idx))}>
                    <Feather name="trash-2" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <Button
              title="Add line item"
              variant="outline"
              icon="plus"
              size="sm"
              onPress={() =>
                setEditLines((rows) => [
                  ...rows,
                  {key: `new-${Date.now()}`, description: '', quantity: '1', unitPrice: '0', isLabor: false},
                ])
              }
            />
            <Button icon="send" loading={busy || sending} title="Save & send to client" onPress={() => saveRevision(true)} />
            <Button variant="outline" loading={busy} title="Save as draft only" onPress={() => saveRevision(false)} />
            <Button variant="ghost" title="Cancel" onPress={() => setRevising(false)} disabled={busy} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
