import {Feather} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import {router, useLocalSearchParams} from "expo-router";
import React, {useState} from "react";
import {
    Alert,
    Image,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useQuote} from "@/context/quote-context";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import useThemeColors from "@/hooks/use-theme-color";

const STATUS_ORDER = ["scheduled", "in-progress", "completed", "invoiced", "paid"] as const;

export default function JobDetailScreen() {
    const {id} = useLocalSearchParams<{ id: string }>();
    const {jobs, updateJob} = useQuote();
    const {colors} = useThemedNavigation();
    const insets = useSafeAreaInsets();

    const [showPayment, setShowPayment] = useState(false);
    const [payAmt, setPayAmt] = useState("");
    const [payNote, setPayNote] = useState("");

    const job = jobs.find((j) => j.id === id);

    if (!job) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <Text className="text-foreground">Job not found</Text>
            </View>
        );
    }

    const totalPaid = job.payments.reduce((s, p) => s + p.amount, 0);
    const balance = job.totalAmount - totalPaid;
    const currentStatusIdx = STATUS_ORDER.indexOf(job.status as typeof STATUS_ORDER[number]);

    const advanceStatus = () => {
        const nextIdx = currentStatusIdx + 1;
        if (nextIdx >= STATUS_ORDER.length) return;
        const next = STATUS_ORDER[nextIdx];
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        updateJob(job.id, {status: next});
    };

    const addPhoto = async (type: "before" | "after") => {
        if (Platform.OS !== "web") {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: "images" as const,
                quality: 0.8,
            });
            if (!result.canceled) {
                const uri = result.assets[0].uri;
                if (type === "before") {
                    updateJob(job.id, {beforePhotos: [...job.beforePhotos, uri]});
                } else {
                    updateJob(job.id, {afterPhotos: [...job.afterPhotos, uri]});
                }
            }
        }
    };

    const handlePayment = () => {
        const amt = parseFloat(payAmt);
        if (!amt || amt <= 0) {
            Alert.alert("Enter a valid amount");
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // addPayment(job.id, {
        //     amount: amt,
        //     date: new Date().toISOString(),
        //     note: payNote || "Payment received",
        // });
        // if (amt >= balance) {
        //     updateJob(job.id, {status: "paid"});
        // } else if (job.status === "completed") {
        //     updateJob(job.id, {status: "invoiced"});
        // }
        setPayAmt("");
        setPayNote("");
        setShowPayment(false);
    };

    const nextStatus = currentStatusIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentStatusIdx + 1] : null;

    return (
        <View className="flex-1" style={{backgroundColor: colors.background}}>
            <View
                className="flex-row items-center gap-3 px-4 pb-3"
                style={{paddingTop: insets.top + 12}}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Feather name="arrow-left" size={22} color={colors.icon}/>
                </TouchableOpacity>
                <Text className="flex-1 text-[17px] font-bold text-foreground" numberOfLines={1}>
                    {job.jobName}
                </Text>
                {/*<StatusBadge status={job.status} />*/}
            </View>

            <ScrollView contentContainerClassName="p-4 pb-36">
                {/* Job Overview */}
                <View className="mb-3.5 rounded-[20px] p-5 gap-3 bg-secondary-foreground">
                    <View className="flex-row items-end justify-between">
                        <View>
                            <Text className="text-[12px] font-semibold uppercase text-slate-400">Total</Text>
                            <Text className="text-[34px] font-black tracking-[-0.5px] text-white">
                                ${job.totalAmount.toLocaleString()}
                            </Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-[12px] font-semibold uppercase text-slate-400">Balance Due</Text>
                            <Text className="text-[24px] font-extrabold tracking-[-0.5px]"
                                  style={{color: balance > 0 ? "#FCA5A5" : "#86EFAC"}}>
                                ${balance.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                    {job.clientName ? (
                        <View className="flex-row items-center gap-1.5">
                            <Feather name="user" size={14} color="#94A3B8"/>
                            <Text className="text-[14px] text-slate-400">{job.clientName}</Text>
                        </View>
                    ) : null}
                    {job.scheduleDate ? (
                        <View className="flex-row items-center gap-1.5">
                            <Feather name="calendar" size={14} color="#94A3B8"/>
                            <Text className="text-[14px] text-slate-400">{formatDate(job.scheduleDate)}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Status Progress */}
                <View className="mb-3.5 rounded-2xl p-4 bg-card">
                    <Text className="mb-3 text-[14px] font-bold uppercase tracking-[0.5px] text-foreground">
                        Status
                    </Text>
                    <View className="flex-row justify-between mb-3.5">
                        {STATUS_ORDER.map((s, i) => (
                            <View key={s} className="flex-1 items-center gap-1">
                                <View
                                    className="h-5.5 w-5.5 items-center justify-center rounded-xl"
                                    style={{backgroundColor: i <= currentStatusIdx ? colors.primary : colors.secondary}}
                                >
                                    {i <= currentStatusIdx && (
                                        <Feather name="check" size={10} color="#fff"/>
                                    )}
                                </View>
                                <Text className="text-[9px] font-semibold text-center leading-3"
                                      style={{color: i <= currentStatusIdx ? colors.primary : colors.secondary}}>
                                    {s.replace("-", "\n")}
                                </Text>
                            </View>
                        ))}
                    </View>
                    {nextStatus && (
                        <TouchableOpacity
                            className="flex-row items-center justify-center gap-2 rounded-xl p-3"
                            style={{backgroundColor: colors.primary}}
                            onPress={advanceStatus}
                            activeOpacity={0.85}
                        >
                            <Text className="text-[14px] font-bold text-white">
                                Mark as {nextStatus.replace("-", " ")}
                            </Text>
                            <Feather name="arrow-right" size={16} color="#fff"/>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Payments */}
                <View className="mb-3.5 rounded-2xl p-4 bg-card">
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-[14px] font-bold uppercase tracking-[0.5px] text-foreground">
                            Payments
                        </Text>
                        {balance > 0 && (
                            <TouchableOpacity
                                className="flex-row items-center gap-1 rounded-lg px-2.5 py-1.5"
                                style={{backgroundColor: colors.state}}
                                onPress={() => setShowPayment(true)}
                            >
                                <Feather name="plus" size={14} color="#fff"/>
                                <Text className="text-[13px] font-semibold text-white">Record</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {job.payments.length === 0 ? (
                        <Text className="mb-2 text-[14px] text-muted-foreground">
                            No payments recorded yet
                        </Text>
                    ) : (
                        job.payments.map((p, i) => (
                            <View key={i}
                                  className="flex-row items-center justify-between py-2.5 border-b border-dashed"
                                  style={{borderBottomColor: colors.border}}>
                                <View>
                                    <Text className="text-[16px] font-bold text-chart-4">
                                        +${p.amount.toLocaleString()}
                                    </Text>
                                    <Text className="text-[12px] text-foreground">
                                        {p.notes}
                                    </Text>
                                </View>
                                <Text className="text-[12px] text-muted-foreground">
                                    {formatDate(p.date)}
                                </Text>
                            </View>
                        ))
                    )}
                    <View className="mt-1 flex-row items-center justify-between pt-2.5 border-t"
                          style={{borderTopColor: colors.border}}>
                        <Text className="text-[13px] font-semibold text-muted-foreground">
                            Paid
                        </Text>
                        <Text className="text-[16px] font-extrabold text-chart-4">
                            ${totalPaid.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Photos */}
                <View className="mb-3.5 rounded-2xl p-4 bg-card">
                    <Text className="mb-3 text-[14px] font-bold uppercase tracking-[0.5px] text-foreground">
                        Job Photos
                    </Text>
                    <PhotoSection
                        label="Before"
                        photos={job.beforePhotos}
                        onAdd={() => addPhoto("before")}
                        colors={colors}
                    />
                    <PhotoSection
                        label="After"
                        photos={job.afterPhotos}
                        onAdd={() => addPhoto("after")}
                        colors={colors}
                    />
                </View>

                {/* Notes */}
                <View className="mb-3.5 rounded-2xl p-4 bg-card">
                    <Text className="mb-3 text-[14px] font-bold uppercase tracking-[0.5px] text-foreground">
                        Notes
                    </Text>
                    <TextInput
                        className="text-foreground min-h-[80px] rounded-[10px] border p-3 text-[14px]"
                        style={{
                            borderColor: colors.border,
                            textAlignVertical: "top"
                        }}
                        value={job.notes}
                        onChangeText={(v) => updateJob(job.id, {notes: v})}
                        multiline
                        placeholder="Add job notes, materials used, issues found..."
                        // placeholderTextColor={colors.mutedForeground}
                    />
                </View>
            </ScrollView>

            {/* Payment Modal */}
            {showPayment && (
                <View className="absolute inset-0 justify-end bg-black/40 z-50" style={{zIndex: 100}}>
                    <TouchableOpacity className="flex-1" onPress={() => setShowPayment(false)} activeOpacity={1}/>
                    <View
                        className="rounded-3xl p-6 gap-3.5 bg-card"
                        style={{
                            paddingBottom: Math.max(insets.bottom, 24),
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24
                        }}
                    >
                        <Text className="text-[20px] font-bold text-foreground">
                            Record Payment
                        </Text>
                        <Text className="text-[14px] text-muted-foreground">
                            Balance due: ${balance.toLocaleString()}
                        </Text>
                        <TextInput
                            className="text-foreground rounded-xl border border-zinc-200 px-3.5 py-3 text-[16px]"
                            // style={{ color: colors.foreground, borderColor: colors.border }}
                            value={payAmt}
                            onChangeText={setPayAmt}
                            placeholder="Amount ($)"
                            // placeholderTextColor={colors.mutedForeground}
                            keyboardType="decimal-pad"
                            autoFocus
                        />
                        <TextInput
                            className="rounded-xl border px-3.5 py-3 text-[16px] text-foreground"
                            // style={{ color: colors.foreground, borderColor: colors.border }}
                            value={payNote}
                            onChangeText={setPayNote}
                            placeholder="Note (optional)"
                            // placeholderTextColor={colors.mutedForeground}
                        />
                        <TouchableOpacity
                            className="mt-1 rounded-xl p-3.5 items-center bg-chart-3"
                            // style={{ backgroundColor: colors.success }}
                            onPress={handlePayment}
                            activeOpacity={0.85}
                        >
                            <Text className="text-[16px] font-bold text-white">Confirm Payment</Text>
                        </TouchableOpacity>
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
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-semibold text-muted-foreground">
                    {label}
                </Text>
                <TouchableOpacity
                    className="flex-row items-center gap-1 rounded-lg px-2.5 py-1.5"
                    style={{backgroundColor: colors.secondary}}
                    onPress={onAdd}
                >
                    <Feather name="plus" size={14} color={colors.primary}/>
                    <Text className="text-[13px] font-semibold" style={{color: colors.primary}}>
                        Add
                    </Text>
                </TouchableOpacity>
            </View>
            {photos.length > 0 ? (
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="gap-2">
                    {photos.map((uri, i) => (
                        <Image key={i} source={{uri}} className="h-24 w-24 rounded-xl"/>
                    ))}
                </ScrollView>
            ) : (
                <TouchableOpacity
                    className="flex-row items-center justify-center gap-2 h-20 border-2 border-dashed rounded-xl"
                    style={{borderColor: colors.border}}
                    onPress={onAdd}
                >
                    <Feather name="camera" size={20} color={colors.secondary}/>
                    <Text className="text-[13px] text-muted-foreground">
                        No {label.toLowerCase()} photos
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"});
}
