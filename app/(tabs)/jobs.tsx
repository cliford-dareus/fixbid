import {Feather} from "@expo/vector-icons";
import {router} from "expo-router";
import React, {useCallback, useState} from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform, RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import {EmptyState} from "@/components/empty-state";
import useThemeColors from "@/hooks/use-theme-color";
import {BlurView} from "expo-blur";
import {cn} from "@/lib/utils";
import {Job, useQuote} from "@/context/quote-context";



type Filter = "all" | "schedule" | "in-progress" | "completed" | "paid";

export default function JobsScreen() {
    const {isDark, isIOS, isWeb, colors} = useThemedNavigation();
    const insets = useSafeAreaInsets();
    const {jobs, fetchJobs, loading} = useQuote()
    const [refreshing, setRefreshing] = useState(false);
    const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
    const [activeStatus, setActiveStatus] = useState<string | null>(null);

    const FILTERS: { key: Filter; label: string }[] = [
        {key: "all", label: "All"},
        {key: "schedule", label: "Scheduled"},
        {key: "in-progress", label: "Active"},
        {key: "completed", label: "Done"},
        {key: "paid", label: "Paid"},
    ];

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchJobs();
        setRefreshing(false);
    }, []);

    if (loading && jobs.length == 0) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#3b82f6"/>
            </View>
        );
    }

    const filtered =
        activeStatus === null ? jobs : jobs.filter((j) => j.status === activeStatus?.toLowerCase());

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

            <View className="justify-between px-5 pb-3.5"
                  style={{paddingTop: topPad + 16}}
            >
                <View>
                    <Text className="text-foreground text-[26px] font-black tracking-[-0.5px]">
                        Job Log
                    </Text>
                    <Text className="text-foreground mt-0.5 text-[13px]">
                        {jobs.length} total jobs
                    </Text>
                </View>

                {/* Filter Pills */}
                <FlatList
                    horizontal
                    data={FILTERS}
                    keyExtractor={(item) => item.label}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        gap: 8, marginTop: 4,
                    }}
                    renderItem={({item}) => {
                        const isActive = item.key === "all" ? !activeStatus : activeStatus === item.key;
                        return (
                            <TouchableOpacity
                                className={cn("gap-2 mt-2 border border-zinc-300 px-4 py-2 rounded-3xl",
                                    isActive ? "bg-primary border-primary" : "bg-card"
                                )}
                                onPress={() => setActiveStatus(item.key === "all" ? null : item.key)}
                                activeOpacity={0.8}
                            >
                                <Text
                                    className={cn("text-sm font-semibold", isActive ? "text-primary-foreground" : "text-foreground")}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {jobs.length === 0 ? (
                <EmptyState
                    icon="briefcase"
                    title="No jobs yet"
                    subtitle="Create a quote and convert it to a job when it's accepted."
                    actionLabel="New Quote"
                    onAction={() => router.push("/quote/new")}
                />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(j) => j.id}
                    contentContainerClassName="px-4 pb-24"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#3b82f6']}
                            tintColor="#3b82f6"
                        />
                    }
                    renderItem={({item}) => <JobCard job={item} colors={colors}/>}
                    ListEmptyComponent={
                        <View className="items-center pt-10">
                            <Text className="text-muted-foreground text-[15px]">
                                No {activeStatus === "all" ? "" : activeStatus} jobs
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

function JobCard({job, colors}: { job: Job; colors: ReturnType<typeof useThemeColors> }) {
    const totalPaid = job.payments.reduce((s, p) => s + p.amount, 0);
    const balance = job.total_amount - totalPaid;
    const hasPhotos = job.before_photos?.length > 0 || job.after_photos?.length > 0;

    return (
        <TouchableOpacity
            className="mb-2.5 rounded-xl p-3.5"
            style={{backgroundColor: colors.background}}
            onPress={() => router.push(`/job/${job.id}`)}
            activeOpacity={0.8}
        >
            <View className="flex-row items-start justify-between">
                <View className="flex-1 gap-0.5 pr-2">
                    <Text className="text-muted-foreground text-[16px] font-bold" numberOfLines={1}>
                        {job.job_name}
                    </Text>
                    <Text className="text-muted-foreground text-[13px]">
                        {job.client_name}
                    </Text>
                </View>
                {/*<StatusBadge status={job.status} />*/}
            </View>

            <View className="gap-1.5">
                <View className="flex-row items-center gap-2.5">
                    <Text className="text-muted-foreground text-[18px] font-black tracking-[-0.3px]">
                        ${job.total_amount}
                    </Text>
                    {balance > 0 && (
                        <Text className="text-destructive text-[13px] font-semibold">
                            ${balance} due
                        </Text>
                    )}
                    {balance <= 0 && job.total_amount > 0 && (
                        <Text className="text-chart-4 text-[13px] font-semibold">
                            Paid in full
                        </Text>
                    )}
                </View>

                <View className="flex-row gap-3.5">
                    {job.schedule_date ? (
                        <View className="flex-row items-center gap-1">
                            <Feather name="calendar" size={12} color={colors.icon}/>
                            <Text className="text-[12px] text-muted-foreground">
                                {formatDate(job.schedule_date)}
                            </Text>
                        </View>
                    ) : null}
                    {hasPhotos && (
                        <View className="flex-row items-center gap-1">
                            <Feather name="camera" size={12} color={colors.icon}/>
                            <Text className="text-[12px] text-muted-foreground">
                                {job.before_photos.length + job.after_photos.length} photos
                            </Text>
                        </View>
                    )}
                    {job.notes ? (
                        <View className="flex-row items-center gap-1">
                            <Feather name="file-text" size={12} color={colors.icon}/>
                            <Text className="text-[12px] text-muted-foreground">
                                Notes
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    );
}

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {month: "short", day: "numeric"});
}
