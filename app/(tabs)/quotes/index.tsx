import React, {useCallback, useEffect, useState} from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl
} from 'react-native';
import {useRouter} from 'expo-router';
import {Eye} from 'lucide-react-native';
import {supabase} from "@/lib/supabase";
import {useAuth} from "@/context/auth-context";
import {Feather} from "@expo/vector-icons";
import {BlurView} from "expo-blur";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import {cn} from "@/lib/utils";
import {useSafeAreaInsets} from "react-native-safe-area-context";

interface Quote {
    id: string;
    client_name: string;
    total_amount: number;
    job_name: string;
    status: string;
    created_at: string;
    quote_line_items?: Array<{
        id: string;
        description: string;
        photo_url?: string;
    }>;
}

export default function QuotesList() {
    const {user} = useAuth();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();
    const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
    const [activeStatus, setActiveStatus] = useState<string | null>(null);
    const {isDark, colors, isWeb, isIOS} = useThemedNavigation()

    const fetchQuotes = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const {data, error} = await supabase
                .from('quotes')
                .select(`
          id,
          client_name,
          total_amount,
          job_name,
          status,
          created_at,
          quote_line_items (
            id,
            description,
            photo_url
          )
        `)
                .eq('handyman_id', user.id)
                .order('created_at', {ascending: false});

            if (error) throw error;
            setQuotes(data || []);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to load quote');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, [user]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchQuotes();
        setRefreshing(false);
    }, []);

    if (loading && quotes.length == 0) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#3b82f6"/>
            </View>
        );
    }

    const filteredQuotes = quotes.filter((t) => {
        return !activeStatus || t.status === activeStatus;
    });

    return (
        <View className="flex-1 bg-background pt-[40px]">
            <View className="absolute top-14 h-[60px] w-full flex-row justify-between items-center px-6">
                <TouchableOpacity
                    className="bg-secondary-foreground w-12 h-12 rounded-full flex-row items-center justify-center border border-zinc-300 z-50">
                    <Feather name="user" size={24} color="white"/>
                </TouchableOpacity>

                {isIOS ? (
                    <BlurView
                        intensity={100}
                        tint={isDark ? "dark" : "light"}
                        className="absolute inset-0"
                    />
                ) : isWeb ? (
                    <View className="absolute inset-0 bg-background"/>
                ) : null}
            </View>

            <View style={{paddingTop: topPad + 16}} className="px-5 py-2">
                <Text className="text-foreground text-2xl font-extrabold -tracking-tighter mb-[2px]">My Quotes</Text>
                <Text className="text-muted-foreground text-xs">
                    {quotes.length} quotes
                </Text>

                {/* Status Chips */}
                <FlatList
                    horizontal
                    data={["All", ...["draft", "sent", "accepted", "declined"]]}
                    keyExtractor={(item) => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        gap: 8, marginTop: 4,
                    }}
                    renderItem={({item}) => {
                        const isActive = item === "All" ? !activeStatus : activeStatus === item;
                        return (
                            <TouchableOpacity
                                className={cn("gap-2 mt-2 border border-zinc-300 px-4 py-2 rounded-3xl",
                                    isActive ? "bg-primary border-primary" : "bg-card"
                                )}
                                onPress={() => setActiveStatus(item === "All" ? null : item)}
                                activeOpacity={0.8}
                            >
                                <Text
                                    className={cn("text-sm font-semibold", isActive ? "text-primary-foreground" : "text-foreground")}
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
                        colors={['#3b82f6']}
                        tintColor="#3b82f6"
                    />
                }
                renderItem={({item}) => <QuoteCard quote={item} colors={colors}/>}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Text className="text-gray-400 text-lg">No quotes yet</Text>
                        <Text className="text-gray-400 text-sm mt-2">Create your first quote from the Templates
                            tab</Text>
                    </View>
                }
            />
        </View>
    );
};

const QuoteCard = ({quote, colors}: { quote: Quote, colors: any }) => {
    const router = useRouter();
    return (
        <TouchableOpacity
            onPress={() => router.push(`/quote/${quote.id}`)}
            className="bg-card rounded-3xl mb-4 gap-2 p-5"
        >
            <View className="flex-row justify-between">
                <View className="flex-1">
                    <Text className="text-gray-500 text-[11px] font-semibold tracking-wider">
                        {formatDate(quote.created_at)}
                    </Text>
                    <Text className="text-foreground font-bold capitalize">{quote.client_name}</Text>
                </View>
                <View className="items-end">
                    <Text className="text-foreground text-[18px] font-extrabold">
                        ${quote.total_amount}
                    </Text>
                    <View className={`mt-2 px-2 py-[2px] rounded-5 self-end ${
                        quote.status === 'approved' ? 'bg-green-100' : 'bg-amber-100'
                    }`}>
                        <Text className={`font-semibold text-[11px] ${
                            quote.status === 'approved' ? 'text-green-700' : 'text-amber-700'
                        }`}>
                            {quote.status}
                        </Text>
                    </View>
                </View>
            </View>

            <View className="flex-row gap-4">
                <View className="flex-row items-center gap-1">
                    <Feather name="clock" size={12} color={colors.icon}/>
                    <Text className="text-xs text-muted-foreground">
                        {quote.job_name}
                    </Text>
                </View>
                <View className="flex-row items-center gap-1">
                    <Feather name="package" size={12} color={colors.icon}/>
                    <Text className="text-xs text-muted-foreground">
                        {quote?.quote_line_items?.length} materials
                    </Text>
                </View>
                {/*<View className="flex-row items-center gap-1">*/}
                {/*    <Feather name="trending-up" size={12} color="white"/>*/}
                {/*    <Text className="text-xs text-muted-foreground">*/}
                {/*        {template.commonUpsells.length} upsells*/}
                {/*    </Text>*/}
                {/*</View>*/}
            </View>

            {/* Show first photo thumbnail if available */}
            {/*{quote.line_items && quote.line_items.length > 0 && quote.line_items[0].photo_url && (*/}
            {/*    <Image*/}
            {/*        source={{uri: quote.line_items[0].photo_url}}*/}
            {/*        className="w-full h-40 rounded-2xl mt-4 object-cover"*/}
            {/*    />*/}
            {/*)}*/}
        </TouchableOpacity>
    )
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};