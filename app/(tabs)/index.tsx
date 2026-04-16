import React from 'react';
import {View, Text, TouchableOpacity, ScrollView, Platform} from 'react-native';
import {useRouter} from 'expo-router';
import {useAuth} from "@/context/auth-context";
import {Feather} from "@expo/vector-icons";
import {BlurView} from "expo-blur";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import {useQuote} from "@/context/quote-context";

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
            <View className="bg-accent w-4 h-4 rounded-xl flex items-center justify-center mb-.5">
                <Feather name={icon} size={18} color={accent}/>
            </View>
            <Text className="text-foreground text-xl font-extrabold">{value}</Text>
            <Text className="text-muted-foreground text-xs font-medium">{label}</Text>
        </View>
    );
}

export default function Dashboard() {
    const router = useRouter();
    const {user} = useAuth();
    const {isDark, isIOS, isWeb} = useThemedNavigation();
    const {quotes, jobs, getTodayJobs} =useQuote();

    const todaysJobs = getTodayJobs();
    // const monthRevenue =
    const openJobs = jobs.filter(job => job.status !== "paid" && job.status !== "completed");
    const pendingQuotes = quotes.filter(quote => quote.status === "sent");

    return (
        <View className="flex-1 bg-background">
            <View className="absolute top-14 border h-[60px] w-full flex-row justify-between items-center px-6">
                <TouchableOpacity
                    className="bg-secondary-foreground w-12 h-12 rounded-full flex-row items-center justify-center border border-zinc-300 z-50">
                    <Feather name="user" size={24} color="white"/>
                </TouchableOpacity>

                <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                        className="bg-secondary-foreground w-12 h-12 rounded-full flex-row items-center justify-center border border-zinc-300 z-50">
                        <Feather name="more-horizontal" size={24} color="white"/>
                    </TouchableOpacity>
                </View>

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

            <ScrollView
                showsVerticalScrollIndicator={false}
                className="flex-1 bg-background pt-[100px] pb-[100px]"
            >
                {/* Header */}
                <View className="flex-row justify-between items-center px-6 pt-6 mb-6">
                    <View>
                        {/*<Text className="text-zinc-500 mt-1">*/}
                        {/*    {new Date().toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'})}*/}
                        {/*</Text>*/}
                        <Text className="text-foreground text-xm">Good morning,</Text>
                        <Text className="text-3xl text-foreground text-bold">Handyman!</Text>
                    </View>
                    <TouchableOpacity
                        className="bg-primary rounded-2xl px-4 py-2 flex-row items-center gap-2"
                        onPress={() => router.push("/quote/new")}
                        activeOpacity={0.85}
                    >
                        <Feather name="plus" size={18} color="bg-primary"/>
                        <Text className="">New Quote</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Stats */}
                <View className="flex-row gap-2.5 px-5 mb-6">
                    <MetricCard
                        label="Month Revenue"
                        value={`$${2000}`}
                        icon="dollar-sign"
                        accent="green"
                    />
                    <MetricCard
                        label="Open Jobs"
                        value={String(openJobs.length)}
                        icon="briefcase"
                        accent="blue"
                    />
                    <MetricCard
                        label="Pending Quotes"
                        value={String(pendingQuotes.length)}
                        icon="file-text"
                        accent="red"
                    />
                </View>

                <View className="px-6 mb-8">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-xl text-foreground font-semibold">Today&#39;s Jobs</Text>
                        <TouchableOpacity>
                            <Text className="text-primary text-xs">See all</Text>
                        </TouchableOpacity>
                    </View>
                    {todaysJobs.length === 0 ? (
                        <View className="bg-background flex-1 items-center justify-center rounded-lg p-6 gap-2">
                            <Feather name="sun" size={24} className="text-foreground"/>
                            <Text className="text-foreground">
                                No jobs scheduled today
                            </Text>
                        </View>
                    ) : (
                        todaysJobs.map((job) => (
                            <TouchableOpacity
                                key={job.id}
                                // onPress={() => router.push(`/job/${job.id}`)}
                                activeOpacity={0.8}
                                className="bg-background rounded-3xl p-3.5 mb-2 shadow-sm flex-row justify-between items-center"
                            >
                                <View className="flex-1 gap-1">
                                    <Text className="text-xs font-semibold" numberOfLines={1}>
                                        {job.jobName}
                                    </Text>
                                    <Text className="text-[12px]" numberOfLines={1}>
                                        {job.clientName}
                                    </Text>
                                </View>
                                <View className="">
                                    {/*<StatusBadge status={job.status} />*/}
                                    <Text className="text-sm font-bold">
                                        ${job.totalAmount.toLocaleString()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Recent Activity */}
                <View className="px-6">
                    <Text className="text-xl text-foreground font-semibold mb-4">Recent Quotes</Text>
                    <View className="bg-white rounded-3xl p-5 mb-4">
                        <Text className="font-medium">Faucet Replacement - Mrs. Johnson</Text>
                        <Text className="text-green-600 mt-1">$185 • Approved</Text>
                        <Text className="text-gray-400 text-sm mt-3">Today at 10:30 AM</Text>
                    </View>

                    <View className="bg-white rounded-3xl p-5">
                        <Text className="font-medium">Toilet Repair - Mr. Ramirez</Text>
                        <Text className="text-amber-600 mt-1">$95 • Sent</Text>
                        <Text className="text-gray-400 text-sm mt-3">Yesterday</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
