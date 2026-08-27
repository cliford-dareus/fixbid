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
    <View className="bg-card flex-1 rounded-2xl p-4 shadow-sm">
      <View className="mb-2 h-8 w-8 items-center justify-center rounded-xl bg-accent">
        <Feather name={icon} size={18} color={accent} />
      </View>
      <Text className="text-foreground text-xl font-extrabold">{value}</Text>
      <Text className="text-muted-foreground text-xs font-medium">{label}</Text>
    </View>
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

function statusLabel(status: string): string {
  const s = (status || 'draft').toLowerCase();
  if (s === 'sent') return 'Sent';
  if (s === 'accepted' || s === 'approved' || s === 'deposit_paid' || s === 'paid') {
    return 'Accepted';
  }
  if (s === 'declined') return 'Declined';
  return 'Draft';
}

function statusColor(status: string): string {
  const s = (status || 'draft').toLowerCase();
  if (s === 'sent') return 'text-amber-600';
  if (s === 'accepted' || s === 'approved' || s === 'deposit_paid' || s === 'paid') {
    return 'text-green-600';
  }
  if (s === 'declined') return 'text-red-600';
  return 'text-slate-500';
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
              <ActionRow
                icon="plus-circle"
                label="New quote"
                onPress={() => router.push('/quote/new')}
              />
              <ActionRow
                icon="users"
                label="Clients"
                onPress={() => router.push('/(tabs)/clients')}
              />
              <ActionRow
                icon="briefcase"
                label="Jobs"
                onPress={() => router.push('/(tabs)/jobs')}
              />
              <ActionRow
                icon="file-text"
                label="All quotes"
                onPress={() => router.push('/(tabs)/quotes')}
              />
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
            <Text className="text-muted-foreground text-[15px]">{greet},</Text>
            <Text className="text-foreground text-3xl font-bold" numberOfLines={1}>
              {name}!
            </Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-2 rounded-2xl bg-primary px-4 py-2.5"
            onPress={() => router.push('/quote/new')}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text className="text-[15px] font-bold text-white">New Quote</Text>
          </TouchableOpacity>
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
            <Text className="text-foreground text-xl font-semibold">Today's jobs</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
              <Text className="text-primary text-xs font-semibold">See all</Text>
            </TouchableOpacity>
          </View>

          {todaysJobs.length === 0 ? (
            <View className="items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-card p-6">
              <Feather name="sun" size={24} color={colors.mutedForeground || '#94a3b8'} />
              <Text className="text-foreground text-center font-medium">
                No jobs scheduled today
              </Text>
              <Text className="text-muted-foreground text-center text-xs">
                Accepted deposits show up here once you set a date.
              </Text>
            </View>
          ) : (
            todaysJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => router.push(`/job/${job.id}`)}
                activeOpacity={0.8}
                className="mb-2 flex-row items-center justify-between rounded-3xl bg-card p-3.5 shadow-sm"
              >
                <View className="flex-1 gap-0.5 pr-2">
                  <Text className="text-foreground text-[15px] font-semibold" numberOfLines={1}>
                    {job.job_name}
                  </Text>
                  <Text className="text-muted-foreground text-[12px]" numberOfLines={1}>
                    {job.client_name}
                  </Text>
                </View>
                <Text className="text-foreground text-sm font-bold">
                  ${Number(job.total_amount).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View className="px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-foreground text-xl font-semibold">Recent quotes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/quotes')}>
              <Text className="text-primary text-xs font-semibold">See all</Text>
            </TouchableOpacity>
          </View>

          {recentQuotes.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-card p-6">
              <Feather name="file-text" size={24} color={colors.mutedForeground || '#94a3b8'} />
              <Text className="text-foreground text-center font-medium">No quotes yet</Text>
              <Text className="text-muted-foreground text-center text-xs">
                Create one from a photo in under a minute.
              </Text>
              <TouchableOpacity
                className="mt-2 rounded-xl bg-primary px-4 py-2"
                onPress={() => router.push('/quote/new')}
              >
                <Text className="font-bold text-white">New quote</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentQuotes.map((q) => (
              <TouchableOpacity
                key={q.id}
                onPress={() => router.push(`/quote/${q.id}`)}
                activeOpacity={0.85}
                className="mb-3 rounded-3xl bg-card p-5 shadow-sm"
              >
                <Text className="text-foreground font-medium" numberOfLines={1}>
                  {q.job_name || 'Quote'} — {q.client_name || 'Client'}
                </Text>
                <Text className={`mt-1 font-semibold ${statusColor(q.status)}`}>
                  ${Number(q.total_amount).toLocaleString()} · {statusLabel(q.status)}
                </Text>
                <Text className="text-muted-foreground mt-2 text-sm">
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
