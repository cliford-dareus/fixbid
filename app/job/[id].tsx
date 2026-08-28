import {Feather} from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {router, useLocalSearchParams} from 'expo-router';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button, Card, CardTitle, HeroCard, Input, StatusBadge} from '@/components/ui';
import {useAuth} from '@/context/auth-context';
import {useQuote} from '@/context/quote-context';
import useThemedNavigation from '@/hooks/use-navigation-theme';
import useThemeColors from '@/hooks/use-theme-color';
import {paymentsApi, type PaymentRecord} from '@/lib/data';
import {cn} from '@/lib/utils';
import {notifyError, notifySuccess, notifyWarning} from '@/lib/feedback';

const STATUS_ORDER = ['schedule', 'in-progress', 'completed', 'invoiced', 'paid'] as const;

function paymentLabel(p: PaymentRecord): string {
  const t = (p.type || 'payment').toLowerCase();
  if (t === 'deposit') return 'Deposit';
  if (t === 'balance' || t === 'final') return 'Balance payment';
  if (t === 'payment') return p.source === 'manual' ? 'Manual payment' : 'Payment';
  return t.replace(/_/g, ' ');
}

function paymentDate(p: PaymentRecord): string {
  const iso = p.created_at || p.date || p.at || '';
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

export default function JobDetailScreen() {
  const {id} = useLocalSearchParams<{id: string}>();
  const {user} = useAuth();
  const {jobs, updateJob, fetchJobs} = useQuote();
  const {colors} = useThemedNavigation();
  const insets = useSafeAreaInsets();

  const [showPayment, setShowPayment] = useState(false);
  const [payAmt, setPayAmt] = useState('');
  const [payNote, setPayNote] = useState('');
  const [recording, setRecording] = useState(false);
  const [tablePayments, setTablePayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const job = jobs.find((j) => j.id === id);

  const loadPayments = useCallback(async () => {
    if (!job?.quote_id) {
      setTablePayments([]);
      return;
    }
    setLoadingPayments(true);
    const result = await paymentsApi.listByQuoteId(job.quote_id);
    if (result.ok) setTablePayments(result.data);
    else setTablePayments([]);
    setLoadingPayments(false);
  }, [job?.quote_id]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const allPayments = useMemo(
    () => paymentsApi.mergePaymentLists(job?.payments, tablePayments),
    [job?.payments, tablePayments],
  );

  if (!job) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-foreground">Job not found</Text>
      </View>
    );
  }

  const totalPaid = allPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = Math.max(0, Number(job.total_amount) - totalPaid);
  const currentStatusIdx = STATUS_ORDER.indexOf(job.status as (typeof STATUS_ORDER)[number]);

  const advanceStatus = () => {
    const nextIdx = currentStatusIdx + 1;
    if (nextIdx >= STATUS_ORDER.length) return;
    const next = STATUS_ORDER[nextIdx];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateJob(job.id, {status: next});
  };

  const addPhoto = async (type: 'before' | 'after') => {
    if (Platform.OS !== 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as const,
        quality: 0.8,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        if (type === 'before') {
          updateJob(job.id, {before_photos: [...job.before_photos, uri]});
        } else {
          updateJob(job.id, {after_photos: [...job.after_photos, uri]});
        }
      }
    }
  };

  const handlePayment = async () => {
    const amt = parseFloat(payAmt);
    if (!amt || amt <= 0) {
      notifyWarning('Invalid amount', 'Enter a payment greater than zero.');
      return;
    }
    if (!user?.id) {
      notifyError('Not logged in', 'Sign in to record payments.');
      return;
    }

    setRecording(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const payType = amt >= balance - 0.01 ? 'balance' : 'payment';

      const tableResult = await paymentsApi.recordManualPayment({
        handymanId: user.id,
        quoteId: job.quote_id || null,
        clientId: job.client_id,
        amount: amt,
        type: payType,
        note: payNote || null,
      });

      const entry = {
        amount: amt,
        type: payType,
        method: 'other' as const,
        date: new Date().toISOString(),
        at: new Date().toISOString(),
        note: payNote || undefined,
      };
      const nextPayments = [...(job.payments || []), entry];
      await updateJob(job.id, {
        payments: nextPayments,
        status: amt >= balance - 0.01 ? 'paid' : job.status === 'completed' ? 'invoiced' : job.status,
      });

      if (tableResult.ok) {
        setTablePayments((prev) => [...prev, tableResult.data]);
      } else {
        await loadPayments();
      }

      try {
        await fetchJobs();
      } catch {
        // non-fatal
      }

      setPayAmt('');
      setPayNote('');
      setShowPayment(false);
      notifySuccess('Payment recorded', `$${amt.toFixed(2)} added to this job.`);
    } catch (e: any) {
      notifyError('Payment failed', e.message || 'Could not record payment');
    } finally {
      setRecording(false);
    }
  };

  const nextStatus =
    currentStatusIdx >= 0 && currentStatusIdx < STATUS_ORDER.length - 1
      ? STATUS_ORDER[currentStatusIdx + 1]
      : null;

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center gap-3 px-4 pb-3"
        style={{paddingTop: insets.top + 12}}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.icon} />
        </TouchableOpacity>
        <Text className="flex-1 text-[17px] font-bold text-foreground" numberOfLines={1}>
          {job.job_name}
        </Text>
        <StatusBadge status={job.status} />
      </View>

      <ScrollView contentContainerClassName="gap-3.5 p-4 pb-36">
        <HeroCard className="gap-3">
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-[12px] font-semibold uppercase text-slate-400">Total</Text>
              <Text className="text-[34px] font-black tracking-[-0.5px] text-white">
                ${Number(job.total_amount).toLocaleString()}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[12px] font-semibold uppercase text-slate-400">Balance Due</Text>
              <Text
                className="text-[24px] font-extrabold tracking-[-0.5px]"
                style={{color: balance > 0 ? '#FCA5A5' : '#86EFAC'}}
              >
                ${balance.toLocaleString()}
              </Text>
            </View>
          </View>
          {job.client_name ? (
            <View className="flex-row items-center gap-1.5">
              <Feather name="user" size={14} color="#94A3B8" />
              <Text className="text-[14px] text-slate-400">{job.client_name}</Text>
            </View>
          ) : null}
          {job.schedule_date ? (
            <View className="flex-row items-center gap-1.5">
              <Feather name="calendar" size={14} color="#94A3B8" />
              <Text className="text-[14px] text-slate-400">{formatDate(job.schedule_date)}</Text>
            </View>
          ) : null}
        </HeroCard>

        <Card>
          <CardTitle>Status</CardTitle>
          <View className="mb-3.5 flex-row justify-between">
            {STATUS_ORDER.map((s, i) => (
              <View key={s} className="flex-1 items-center gap-1">
                <View
                  className={cn(
                    'h-6 w-6 items-center justify-center rounded-xl',
                    i <= currentStatusIdx ? 'bg-primary' : 'bg-secondary',
                  )}
                >
                  {i <= currentStatusIdx && <Feather name="check" size={10} color="#fff" />}
                </View>
                <Text
                  className="text-center text-[9px] font-semibold leading-3"
                  style={{color: i <= currentStatusIdx ? colors.primary : colors.secondary}}
                >
                  {s.replace('-', '\n')}
                </Text>
              </View>
            ))}
          </View>
          {nextStatus ? (
            <Button
              title={`Mark as ${nextStatus.replace('-', ' ')}`}
              icon="arrow-right"
              iconPosition="right"
              size="sm"
              onPress={advanceStatus}
            />
          ) : null}
        </Card>

        <Card>
          <View className="mb-3 flex-row items-center justify-between">
            <CardTitle className="mb-0">Payments</CardTitle>
            {balance > 0 ? (
              <Button title="Record" size="sm" icon="plus" onPress={() => setShowPayment(true)} />
            ) : null}
          </View>

          {loadingPayments ? (
            <ActivityIndicator className="my-3" color={colors.primary} />
          ) : allPayments.length === 0 ? (
            <Text className="mb-2 text-[14px] text-muted-foreground">
              No payments yet. Client deposits appear here after checkout.
            </Text>
          ) : (
            allPayments.map((p, i) => (
              <View
                key={p.id || `${p.amount}-${p.date || p.at || i}`}
                className="flex-row items-center justify-between border-b border-dashed border-zinc-200 py-2.5"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-[16px] font-bold text-emerald-600">
                    +$
                    {Number(p.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text className="text-[12px] font-semibold capitalize text-foreground">
                    {paymentLabel(p)}
                  </Text>
                  {p.source === 'checkout.session.completed' ||
                  p.source === 'payment_intent.succeeded' ||
                  p.stripe_payment_intent_id ? (
                    <Text className="text-[11px] text-muted-foreground">via Stripe</Text>
                  ) : p.source === 'manual' ? (
                    <Text className="text-[11px] text-muted-foreground">Recorded manually</Text>
                  ) : null}
                </View>
                <Text className="text-[12px] text-muted-foreground">{paymentDate(p)}</Text>
              </View>
            ))
          )}

          <View className="mt-1 flex-row items-center justify-between border-t border-zinc-200 pt-2.5">
            <Text className="text-[13px] font-semibold text-muted-foreground">Paid</Text>
            <Text className="text-[16px] font-extrabold text-emerald-600">
              $
              {totalPaid.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="text-[13px] font-semibold text-muted-foreground">Remaining</Text>
            <Text
              className="text-[15px] font-bold"
              style={{color: balance > 0 ? '#dc2626' : '#16a34a'}}
            >
              $
              {balance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </Card>

        <Card>
          <CardTitle>Job Photos</CardTitle>
          <PhotoSection
            label="Before"
            photos={job.before_photos}
            onAdd={() => addPhoto('before')}
            colors={colors}
          />
          <PhotoSection
            label="After"
            photos={job.after_photos}
            onAdd={() => addPhoto('after')}
            colors={colors}
          />
        </Card>

        <Card>
          <CardTitle>Notes</CardTitle>
          <Input
            multiline
            value={job.notes}
            onChangeText={(v) => updateJob(job.id, {notes: v})}
            placeholder="Add job notes, materials used, issues found..."
            inputClassName="min-h-[80px]"
          />
        </Card>
      </ScrollView>

      {showPayment && (
        <View className="absolute inset-0 z-50 justify-end bg-black/40" style={{zIndex: 100}}>
          <TouchableOpacity className="flex-1" onPress={() => setShowPayment(false)} activeOpacity={1} />
          <View
            className="gap-3.5 rounded-t-3xl bg-card p-6"
            style={{paddingBottom: Math.max(insets.bottom, 24)}}
          >
            <Text className="text-[20px] font-bold text-foreground">Record Payment</Text>
            <Text className="text-[14px] text-muted-foreground">
              Balance due: ${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </Text>
            <Input
              value={payAmt}
              onChangeText={setPayAmt}
              placeholder="Amount ($)"
              keyboardType="decimal-pad"
              autoFocus
            />
            <Input value={payNote} onChangeText={setPayNote} placeholder="Note (optional)" />
            <Button
              title="Confirm Payment"
              variant="success"
              loading={recording}
              onPress={handlePayment}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function PhotoSection({
  label,
  photos,
  onAdd,
  colors,
}: {
  label: string;
  photos: string[];
  onAdd: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View className="mb-3.5">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-muted-foreground">{label}</Text>
        <Button title="Add" size="sm" variant="secondary" icon="plus" onPress={onAdd} />
      </View>
      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
          {photos.map((uri, i) => (
            <Image key={i} source={{uri}} className="h-24 w-24 rounded-xl" />
          ))}
        </ScrollView>
      ) : (
        <TouchableOpacity
          className="h-20 flex-row items-center justify-center gap-2 rounded-xl border-2 border-dashed"
          style={{borderColor: colors.border}}
          onPress={onAdd}
        >
          <Feather name="camera" size={20} color={colors.secondary} />
          <Text className="text-[13px] text-muted-foreground">No {label.toLowerCase()} photos</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
