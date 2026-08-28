import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import {useRouter} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import {BlurView} from 'expo-blur';
import useThemedNavigation from '@/hooks/use-navigation-theme';
import {cn} from '@/lib/utils';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Quote, useQuote} from '@/context/quote-context';
import {EmptyState, StatusBadge} from '@/components/ui';

export default function QuotesList() {
  const {quotes, fetchQuotes, loading} = useQuote();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const {isDark, colors, isWeb, isIOS} = useThemedNavigation();
  const router = useRouter();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchQuotes();
    setRefreshing(false);
  }, [fetchQuotes]);

  if (loading && quotes.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  const filteredQuotes = quotes.filter((t) => {
    return !activeStatus || t.status === activeStatus;
  });

  return (
    <View className="flex-1 bg-background pt-[40px]">
      <View className="absolute top-14 z-50 h-[60px] w-full flex-row items-center justify-between px-6">
        <TouchableOpacity className="z-50 h-12 w-12 flex-row items-center justify-center rounded-full border border-zinc-300 bg-secondary-foreground">
          <Feather name="user" size={24} color="white" />
        </TouchableOpacity>

        {isIOS ? (
          <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} className="absolute inset-0" />
        ) : isWeb ? (
          <View className="absolute inset-0 bg-background" />
        ) : null}
      </View>

      <View style={{paddingTop: topPad + 16}} className="px-5 py-2">
        <Text className="mb-[2px] text-2xl font-extrabold tracking-tighter text-foreground">
          My Quotes
        </Text>
        <Text className="text-xs text-muted-foreground">{quotes.length} quotes</Text>

        <FlatList
          horizontal
          data={['All', 'draft', 'sent', 'accepted', 'declined']}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap: 8, marginTop: 4}}
          renderItem={({item}) => {
            const isActive = item === 'All' ? !activeStatus : activeStatus === item;
            return (
              <TouchableOpacity
                className={cn(
                  'mt-2 gap-2 rounded-3xl border border-zinc-300 px-4 py-2',
                  isActive ? 'border-primary bg-primary' : 'bg-card',
                )}
                onPress={() => setActiveStatus(item === 'All' ? null : item)}
                activeOpacity={0.8}
              >
                <Text
                  className={cn(
                    'text-sm font-semibold capitalize',
                    isActive ? 'text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filteredQuotes}
        keyExtractor={(item) => item.id}
        className="px-6 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f97316']}
            tintColor="#f97316"
          />
        }
        renderItem={({item}) => <QuoteCard quote={item} colors={colors} />}
        ListEmptyComponent={
          <EmptyState
            variant="card"
            icon="file-text"
            title="No quotes yet"
            subtitle="Create your first quote from New Quote or Templates."
            actionLabel="New quote"
            onAction={() => router.push('/quote/new')}
            className="mx-0 mt-8"
          />
        }
      />
    </View>
  );
}

function QuoteCard({quote, colors}: {quote: Quote; colors: {icon?: string}}) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push(`/quote/${quote.id}`)}
      className="mb-4 gap-2 rounded-3xl bg-card p-5"
      activeOpacity={0.85}
    >
      <View className="flex-row justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-[11px] font-semibold tracking-wider text-muted-foreground">
            {formatDate(quote.created_at)}
          </Text>
          <Text className="font-bold capitalize text-foreground">{quote.client_name}</Text>
        </View>
        <View className="items-end gap-1">
          <Text className="text-[18px] font-extrabold text-foreground">
            ${Number(quote.total_amount).toLocaleString()}
          </Text>
          <StatusBadge status={quote.status} />
        </View>
      </View>

      <View className="flex-row gap-4">
        <View className="flex-row items-center gap-1">
          <Feather name="clock" size={12} color={colors.icon} />
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {quote.job_name}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Feather name="package" size={12} color={colors.icon} />
          <Text className="text-xs text-muted-foreground">
            {quote?.quote_line_items?.length ?? 0} items
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
