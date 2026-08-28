import React, {useMemo} from 'react';
import {ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import {BlurView} from 'expo-blur';
import useThemedNavigation from '@/hooks/use-navigation-theme';
import {useQuote} from '@/context/quote-context';
import {useProfile} from '@/context/profile-context';
import Popover from 'react-native-popover-view';
import {GlassView} from 'expo-glass-effect';
import {Button, Card, EmptyState, StatusBadge} from '@/components/ui';

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
}) {
  return (
    <Card className="flex-1 shadow-sm">
      <View className="mb-2 h-8 w-8 items-center justify-center rounded-xl bg-accent">
        <Feather name={icon} size={18} color={accent} />
      </View>
      <Text className="text-xl font-extrabold text-foreground">{value}</Text>
      <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
    </Card>
  );
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(full?: string | null): string {
  if (!full?.trim()) return 'there';
  return full.trim().split(/\s+/)[0];
}

function formatQuoteWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startThat.getTime()) / 86400000);
  if (diffDays === 0) {
    return (
      'Today at ' +
      d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})
    );
  }
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

const WON_STATUSES = new Set(['accepted', 'approved', 'deposit_paid', 'paid']);
const LOST_STATUSES = new Set(['declined']);
const SENT_OR_LATER = new Set([
  'sent',
  'accepted',
  'approved',
  'deposit_paid',
  'paid',
  'declined',
]);

/** Start of local week (Monday 00:00). */
function startOfWeek(ref = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + 7);
  return d;
}

function inRange(iso: string | undefined | null, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= start.getTime() && t < end.getTime();
}

function formatWeekLabel(start: Date, end: Date): string {
  const last = new Date(end.getTime() - 1);
  const opts: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric'};
  return `${start.toLocaleDateString('en-US', opts)} – ${last.toLocaleDateString('en-US', opts)}`;
}

function moneyFromJobsThisWeek(
  jobs: {
    payments?: {amount?: number; at?: string; date?: string}[];
    status?: string;
    total_amount?: number;
    created_at?: string;
  }[],
  start: Date,
  end: Date,
): number {
  let total = 0;
  for (const job of jobs) {
    const payments = job.payments || [];
    let paidInWeek = 0;
    for (const p of payments) {
      const when = p.at || p.date || job.created_at;
      if (inRange(when || null, start, end)) {
        paidInWeek += Number(p.amount) || 0;
      }
    }
    if (paidInWeek > 0) {
      total += paidInWeek;
      continue;
    }
    if (
      payments.length === 0 &&
      inRange(job.created_at || null, start, end) &&
      (job.status === 'paid' || job.status === 'completed')
    ) {
      total += Number(job.total_amount) || 0;
    }
  }
  return total;
}

export default function Dashboard() {
  const router = useRouter();
  const {isDark, isIOS, isWeb, colors} = useThemedNavigation();
  const {profile} = useProfile();
  const {quotes, jobs, getTodayJobs, getMonthRevenue} = useQuote();

  const todaysJobs = getTodayJobs();
  const monthRevenue = getMonthRevenue();
  const openJobs = jobs.filter(
    (job) => job.status !== 'paid' && job.status !== 'completed',
  );
  const pendingQuotes = quotes.filter((quote) => quote.status === 'sent');
  const recentQuotes = useMemo(() => quotes.slice(0, 5), [quotes]);

  const weekStats = useMemo(() => {
    const weekStart = startOfWeek();
    const weekEnd = endOfWeek(weekStart);

    const moneyMade = moneyFromJobsThisWeek(jobs, weekStart, weekEnd);

    const quotesSent = quotes.filter((q) => {
      const st = (q.status || '').toLowerCase();
      return SENT_OR_LATER.has(st) && inRange(q.created_at, weekStart, weekEnd);
    }).length;

    const decided = quotes.filter((q) => {
      const st = (q.status || '').toLowerCase();
      return (
        (WON_STATUSES.has(st) || LOST_STATUSES.has(st)) &&
        inRange(q.created_at, weekStart, weekEnd)
      );
    });
    const won = decided.filter((q) => WON_STATUSES.has((q.status || '').toLowerCase()));
    const winRate =
      decided.length > 0 ? Math.round((won.length / decided.length) * 100) : null;

    return {
      moneyMade,
      quotesSent,
      winRate,
      decidedCount: decided.length,
      label: formatWeekLabel(weekStart, weekEnd),
    };
  }, [jobs, quotes]);

  const hour = new Date().getHours();
  const greet = greetingForHour(hour);
  const name = firstName(profile?.full_name || profile?.business_name);

  return (
    <View className="flex-1 bg-background">
      <View className="absolute top-14 z-50 h-[60px] w-full flex-row items-center justify-between px-6">
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          className="z-50 h-12 w-12 flex-row items-center justify-center rounded-full border border-zinc-300 bg-secondary-foreground"
          accessibilityLabel="Settings"
        >
          <Feather name="user" size={24} color="#fff" />
        </TouchableOpacity>

        <View className="flex-row items-center gap-2">
          <Popover
            from={
              <TouchableOpacity
                className="z-50 h-12 w-12 flex-row items-center justify-center rounded-full border border-zinc-300 bg-secondary-foreground"
                accessibilityLabel="Quick actions"
              >
                <Feather name="more-horizontal" size={24} color="#fff" />
              </TouchableOpacity>
            }
            arrowSize={{width: 0, height: 0}}
            displayAreaInsets={{top: 100, bottom: 100, left: 50, right: 16}}
            popoverStyle={{
              backgroundColor: 'transparent',
              padding: 0,
              borderRadius: 24,
              borderColor: 'transparent',
              borderWidth: 0,
              shadowColor: 'transparent',
              shadowOpacity: 0,
              shadowRadius: 0,
              elevation: 50,
              overflow: 'hidden',
            }}
          >
            <GlassView
              style={{
                width: 220,
                padding: 12,
                borderRadius: 20,
                backgroundColor: 'rgb(24 24 27 / 0.85)',
              }}
              glassEffectStyle="clear"
            >
              <Text className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quick actions
              </Text>
              <ActionRow icon="plus" label="New quote" onPress={() => router.push('/quote/new')} />
              <ActionRow icon="user-plus" label="New client" onPress={() => router.push('/client/new')} />
              <ActionRow icon="settings" label="Settings" onPress={() => router.push('/settings')} />
            </GlassView>
          </Popover>
        </View>

        {isIOS ? (
          <BlurView
            intensity={100}
            tint={isDark ? 'dark' : 'light'}
            className="absolute inset-0 -z-10"
          />
        ) : isWeb ? (
          <View className="absolute inset-0 -z-10 bg-background" />
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-background pt-[100px]"
        contentContainerStyle={{paddingBottom: 120}}
      >
        <View className="mb-6 flex-row items-center justify-between px-6 pt-6">
          <View className="flex-1 pr-3">
            <Text className="text-[15px] text-muted-foreground">{greet},</Text>
            <Text className="text-3xl font-bold text-foreground" numberOfLines={1}>
              {name}!
            </Text>
          </View>
          <Button
            title="New Quote"
            icon="plus"
            size="sm"
            onPress={() => router.push('/quote/new')}
          />
        </View>

        <View className="mb-4 px-5">
          <Card className="overflow-hidden border border-zinc-200/80 p-0 shadow-sm dark:border-zinc-800">
            <View className="flex-row items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <View>
                <Text className="text-[15px] font-bold text-foreground">This week</Text>
                <Text className="text-[12px] text-muted-foreground">{weekStats.label}</Text>
              </View>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                <Feather name="trending-up" size={18} color="#16a34a" />
              </View>
            </View>
            <View className="flex-row">
              <View className="flex-1 items-center px-2 py-4">
                <Text className="text-[22px] font-black tracking-tight text-foreground">
                  ${Number(weekStats.moneyMade || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
                </Text>
                <Text className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Money made
                </Text>
              </View>
              <View className="w-px bg-zinc-100 dark:bg-zinc-800" />
              <View className="flex-1 items-center px-2 py-4">
                <Text className="text-[22px] font-black tracking-tight text-foreground">
                  {weekStats.quotesSent}
                </Text>
                <Text className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Quotes sent
                </Text>
              </View>
              <View className="w-px bg-zinc-100 dark:bg-zinc-800" />
              <View className="flex-1 items-center px-2 py-4">
                <Text className="text-[22px] font-black tracking-tight text-foreground">
                  {weekStats.winRate == null ? '—' : `${weekStats.winRate}%`}
                </Text>
                <Text className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Win rate
                </Text>
              </View>
            </View>
            {weekStats.decidedCount === 0 ? (
              <Text className="border-t border-zinc-100 px-4 py-2.5 text-center text-[12px] text-muted-foreground dark:border-zinc-800">
                Win rate appears after clients accept or decline
              </Text>
            ) : null}
          </Card>
        </View>

        <View className="mb-6 flex-row gap-2.5 px-5">
          <MetricCard
            label="Month revenue"
            value={`$${Number(monthRevenue || 0).toLocaleString()}`}
            icon="dollar-sign"
            accent="#16a34a"
          />
          <MetricCard
            label="Open jobs"
            value={String(openJobs.length)}
            icon="briefcase"
            accent="#2563eb"
          />
          <MetricCard
            label="Pending quotes"
            value={String(pendingQuotes.length)}
            icon="file-text"
            accent="#dc2626"
          />
        </View>

        <View className="mb-8 px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-foreground">Today's jobs</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
              <Text className="text-xs font-semibold text-primary">See all</Text>
            </TouchableOpacity>
          </View>

          {todaysJobs.length === 0 ? (
            <EmptyState
              variant="card"
              icon="sun"
              title="No jobs scheduled today"
              subtitle="Accepted deposits show up here once you set a date."
            />
          ) : (
            todaysJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => router.push(`/job/${job.id}`)}
                activeOpacity={0.85}
                className="mb-3 flex-row items-center justify-between rounded-3xl bg-card p-5 shadow-sm"
              >
                <View className="flex-1 pr-3">
                  <Text className="font-semibold text-foreground" numberOfLines={1}>
                    {job.job_name}
                  </Text>
                  <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={1}>
                    {job.client_name}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-foreground">
                  ${Number(job.total_amount).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View className="px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-foreground">Recent quotes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/quotes')}>
              <Text className="text-xs font-semibold text-primary">See all</Text>
            </TouchableOpacity>
          </View>

          {recentQuotes.length === 0 ? (
            <EmptyState
              variant="card"
              icon="file-text"
              title="No quotes yet"
              subtitle="Create one from a photo in under a minute."
              actionLabel="New quote"
              onAction={() => router.push('/quote/new')}
            />
          ) : (
            recentQuotes.map((q) => (
              <TouchableOpacity
                key={q.id}
                onPress={() => router.push(`/quote/${q.id}`)}
                activeOpacity={0.85}
                className="mb-3 rounded-3xl bg-card p-5 shadow-sm"
              >
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="flex-1 font-medium text-foreground" numberOfLines={1}>
                    {q.job_name || 'Quote'} — {q.client_name || 'Client'}
                  </Text>
                  <StatusBadge status={q.status} />
                </View>
                <Text className="mt-1 font-semibold text-foreground">
                  ${Number(q.total_amount).toLocaleString()}
                </Text>
                <Text className="mt-2 text-sm text-muted-foreground">
                  {formatQuoteWhen(q.created_at)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl px-2 py-3"
      activeOpacity={0.75}
    >
      <Feather name={icon} size={18} color="#e2e8f0" />
      <Text className="text-[15px] font-semibold text-slate-100">{label}</Text>
    </TouchableOpacity>
  );
}
