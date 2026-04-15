import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, Platform} from 'react-native';
import {useRouter} from 'expo-router';
import {Plus, Eye} from 'lucide-react-native';
import {supabase} from "@/lib/supabase";
import {useAuth} from "@/context/auth-context";
import {Feather} from "@expo/vector-icons";
import {BlurView} from "expo-blur";
import useThemedNavigation from "@/hooks/use-navigation-theme";

interface Quote {
    id: string;
    client_name: string;
    total_amount: number;
    // job_name: string;
    status: string;
    created_at: string;
    line_items?: Array<{
        id: string;
        description: string;
        photo_url?: string;
    }>;
}

export default function QuotesList() {
    const router = useRouter();
    const {user} = useAuth();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);

    const isIOS = Platform.OS === "ios";
    const isWeb = Platform.OS === "web";
    const {isDark, colors} = useThemedNavigation()

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
          status,
          created_at,
          quote_line_items (
            id,
            description,
            photo_url
          )
        `)
                .order('created_at', {ascending: false});

            if (error) throw error;
            setQuotes(data || []);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to load quotes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, [user]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#3b82f6"/>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background pt-[100px]">
            <View className="absolute top-14 h-[60px] w-full flex-row justify-between items-center px-6">
                <TouchableOpacity
                    className="bg-secondary-foreground w-14 h-14 rounded-full flex-row items-center justify-center border border-zinc-300 z-50">
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

            <View className="px-6 py-4 border-b border-gray-200 flex-row justify-between items-center">
                <Text className="text-2xl font-bold">My Quotes</Text>
                {/*<TouchableOpacity*/}
                {/*    onPress={() => router.push('/(tabs)/quotes/new')}*/}
                {/*    className="bg-blue-600 px-5 py-2 rounded-2xl flex-row items-center gap-2"*/}
                {/*>*/}
                {/*    <Plus size={20} color="white"/>*/}
                {/*    <Text className="text-white font-semibold">New</Text>*/}
                {/*</TouchableOpacity>*/}
            </View>

            <FlatList
                data={quotes}
                keyExtractor={(item) => item.id}
                className="px-6 pt-4"
                // refreshControl={/* You can add Pull-to-Refresh later */}
                renderItem={({item}) => (
                    <TouchableOpacity
                        onPress={() => router.push(`/quotes/${item.id}`)} // We'll create detail view later
                        className="bg-white rounded-3xl p-5 mb-4 shadow-sm"
                    >
                        <View className="flex-row justify-between">
                            <View className="flex-1">
                                <Text className="text-xl font-semibold">{item.client_name}</Text>
                                <Text className="text-gray-500 text-sm mt-1">
                                    {formatDate(item.created_at)}
                                </Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-3xl font-bold text-green-600">
                                    ${item.total_amount}
                                </Text>
                                <View className={`mt-2 px-4 py-1 rounded-full self-end ${
                                    item.status === 'approved' ? 'bg-green-100' : 'bg-amber-100'
                                }`}>
                                    <Text className={`text-xs font-medium capitalize ${
                                        item.status === 'approved' ? 'text-green-700' : 'text-amber-700'
                                    }`}>
                                        {item.status}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Show first photo thumbnail if available */}
                        {item.line_items && item.line_items.length > 0 && item.line_items[0].photo_url && (
                            <Image
                                source={{uri: item.line_items[0].photo_url}}
                                className="w-full h-40 rounded-2xl mt-4 object-cover"
                            />
                        )}

                        <TouchableOpacity
                            className="mt-4 bg-gray-100 py-3 rounded-2xl flex-row justify-center items-center gap-2"
                            onPress={() => {/* Later: regenerate PDF from this quote */
                            }}
                        >
                            <Eye size={18} color="#374151"/>
                            <Text className="text-gray-700 font-medium">View / Regenerate PDF</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
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
}