import {Feather} from "@expo/vector-icons";
import {router} from "expo-router";
import React, {useState} from "react";
import {
    FlatList,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import {Job, useQuote} from "@/context/quote-context";
import {EmptyState} from "@/components/empty-state";
import useThemeColors from "@/hooks/use-theme-color";
import {BlurView} from "expo-blur";
import {cn} from "@/lib/utils";

type Filter = "all" | "scheduled" | "in-progress" | "completed" | "paid";

export default function JobsScreen() {
    const {isDark, isIOS, isWeb, colors} = useThemedNavigation();
    const insets = useSafeAreaInsets();
    const {jobs} = useQuote();
    const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
    const [activeStatus, setActiveStatus] = useState<string | null>(null);

    const filtered =
        activeStatus === "all" ? jobs : jobs.filter((j) => j.status === activeStatus);

    const FILTERS: { key: Filter; label: string }[] = [
        {key: "all", label: "All"},
        {key: "schedule", label: "Scheduled"},
        {key: "in-progress", label: "Active"},
        {key: "completed", label: "Done"},
        {key: "paid", label: "Paid"},
    ];

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
                    keyExtractor={(item) => item.key}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        gap: 8, marginTop: 4,
                    }}
                    renderItem={({item}) => {
                        const isActive = item.label === "All" ? !activeStatus : activeStatus === item.label;
                        return (
                            <TouchableOpacity
                                className={cn("gap-2 mt-2 border border-zinc-300 px-4 py-2 rounded-3xl",
                                    isActive ? "bg-primary border-primary" : "bg-card"
                                )}
                                onPress={() => setActiveStatus(item.label === "All" ? null : item.label)}
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
    const balance = job.totalAmount - totalPaid;
    const hasPhotos = job.beforePhotos.length > 0 || job.afterPhotos.length > 0;

    return (
        <TouchableOpacity
            className="mb-2.5 rounded-xl p-3.5"
            style={{backgroundColor: colors.background}}
            // onPress={() => router.push(`/job/${job.id}`)}
            activeOpacity={0.8}
        >
            <View className="flex-row items-start justify-between">
                <View className="flex-1 gap-0.5 pr-2">
                    <Text className="text-muted-foreground text-[16px] font-bold" numberOfLines={1}>
                        {job.jobName}
                    </Text>
                    <Text className="text-muted-foreground text-[13px]">
                        {job.clientName}
                    </Text>
                </View>
                {/*<StatusBadge status={job.status} />*/}
            </View>

            <View className="gap-1.5">
                <View className="flex-row items-center gap-2.5">
                    <Text className="text-muted-foreground text-[18px] font-black tracking-[-0.3px]">
                        ${job.totalAmount.toLocaleString()}
                    </Text>
                    {balance > 0 && (
                        <Text className="text-destructive text-[13px] font-semibold">
                            ${balance.toLocaleString()} due
                        </Text>
                    )}
                    {balance <= 0 && job.totalAmount > 0 && (
                        <Text className="text-chart-4 text-[13px] font-semibold">
                            Paid in full
                        </Text>
                    )}
                </View>

                <View className="flex-row gap-3.5">
                    {job.scheduleDate ? (
                        <View className="flex-row items-center gap-1">
                            <Feather name="calendar" size={12} color={colors.icon}/>
                            <Text className="text-[12px] text-muted-foreground">
                                {formatDate(job.scheduleDate)}
                            </Text>
                        </View>
                    ) : null}
                    {hasPhotos && (
                        <View className="flex-row items-center gap-1">
                            <Feather name="camera" size={12} color={colors.icon}/>
                            <Text className="text-[12px] text-muted-foreground">
                                {job.beforePhotos.length + job.afterPhotos.length} photos
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
