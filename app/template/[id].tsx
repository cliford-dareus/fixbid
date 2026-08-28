import {Feather} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {router, useLocalSearchParams} from "expo-router";
import React, {useState} from "react";
import {
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {calculateJobCost, getTemplateById} from "@/data/templates";
import {useClients} from "@/context/quote-context";
import {setNewQuoteSeed} from "@/lib/new-quote-seed";
import {cn} from "@/lib/utils";

export default function TemplateDetailScreen() {
    const {id} = useLocalSearchParams<{ id: string }>();
    const template = getTemplateById(id ?? "");
    const insets = useSafeAreaInsets();
    const {clients} = useClients();
    const [qty, setQty] = useState("1");
    const [markup, setMarkup] = useState("20");
    const [selectedClientId, setSelectedClientId] = useState<string>("");

    if (!template) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <Text className="text-foreground">Template not found</Text>
            </View>
        );
    }

    const qtyNum = Math.max(1, parseInt(qty) || 1);
    const cost = calculateJobCost(template, 1 + parseFloat(markup || "20") / 100);
    const total = cost.suggested * qtyNum;

    const handleCreateQuote = () => {
        if (!selectedClientId) {
            Alert.alert("Select a client", "Choose a client to create the quote for.");
            return;
        }

        const client = clients.find((c) => c.id === selectedClientId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setNewQuoteSeed({
            jobName: template.name,
            clientId: selectedClientId,
            clientName: client?.name || "",
            clientPhone: client?.phone || "",
            notes: `Generated from template: ${template.name}\nCommon upsells: ${template.commonUpsells.join(", ")}`,
            totalAmount: total,
            lineItems: [
                {
                    description: `Labor - ${template.name} (${template.timeEstimateHours * qtyNum}h @ $${template.laborRate}/hr)`,
                    quantity: 1,
                    unitPrice: template.timeEstimateHours * template.laborRate * qtyNum,
                    isLabor: true,
                },
                ...template.materials
                    .filter((m) => m.qty > 0)
                    .map((m) => ({
                        description: m.name,
                        quantity: m.qty * qtyNum,
                        unitPrice: m.avgCost * (1 + parseFloat(markup || "20") / 100),
                        isLabor: false,
                    })),
            ],
        });

        router.push(`/quote/new`);
    };

    return (
        <View className="flex-1 bg-background">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{paddingBottom: 160}}
            >
                <View className="flex gap-4 bg-secondary-foreground p-6 pt-16">
                    <TouchableOpacity style={{marginTop: 8}} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={22} color="#fff"/>
                    </TouchableOpacity>
                    <View className="self-start rounded-3xl bg-primary/20 px-4 py-2">
                        <Text className="text-xs font-bold uppercase text-primary">
                            {template.category}
                        </Text>
                    </View>
                    <Text className="text-2xl font-extrabold tracking-tighter text-white">{template.name}</Text>
                    <Text className="text-xs leading-5 text-slate-400">{template.description}</Text>
                    <View className="mt-3 flex-1 flex-row items-center">
                        <HeroStat icon="clock" label={`${template.timeEstimateHours}h`} sub="Est. time"/>
                        <HeroStat icon="dollar-sign" label={`$${template.laborRate}/hr`} sub="Labor rate"/>
                        <HeroStat icon="tag" label={`$${cost.suggested}`} sub="Suggested"/>
                    </View>
                </View>

                <View className="gap-3 rounded-2xl p-4" style={{margin: 16}}>
                    <Text className="text-base font-bold text-foreground">Job Settings</Text>
                    <View className="flex-row gap-3">
                        <View className="flex-1 gap-2">
                            <Text className="text-xs font-semibold text-muted-foreground">Quantity / Units</Text>
                            <TextInput
                                className="rounded-lg border border-zinc-300 px-4 py-2 text-base text-foreground"
                                value={qty}
                                onChangeText={setQty}
                                keyboardType="number-pad"
                            />
                        </View>
                        <View className="flex-1 gap-2">
                            <Text className="text-xs font-semibold text-muted-foreground">Material Markup %</Text>
                            <TextInput
                                className="rounded-lg border border-zinc-300 px-4 py-2 text-base text-foreground"
                                value={markup}
                                onChangeText={setMarkup}
                                keyboardType="number-pad"
                            />
                        </View>
                    </View>
                    <View className="flex-row items-center justify-between rounded-xl bg-primary/20 p-4">
                        <Text className="text-xs font-semibold text-muted-foreground">Quote Total</Text>
                        <Text className="text-2xl font-extrabold tracking-tighter text-primary">
                            ${total.toLocaleString()}
                        </Text>
                    </View>
                </View>

                <View className="mb-5 px-6">
                    <Text className="mb-3 text-base font-bold text-foreground">Materials</Text>
                    {template.materials.map((m, i) => (
                        <View key={i} className="flex-row items-center justify-between py-2">
                            <View className="gap-1">
                                <Text className="text-[15px] font-bold text-foreground">{m.name}</Text>
                                <Text className="text-xs font-semibold text-muted-foreground">
                                    {m.qty > 0 ? `${m.qty * qtyNum} ${m.unit}` : "as needed"}
                                </Text>
                            </View>
                            <Text className="text-base font-bold text-foreground">
                                {m.qty > 0 ? `$${(m.avgCost * m.qty * qtyNum).toFixed(2)}` : "—"}
                            </Text>
                        </View>
                    ))}
                </View>

                <View className="mb-5 px-6">
                    <Text className="mb-2 text-base font-bold text-foreground">Common Upsells</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {template.commonUpsells.map((u, i) => (
                            <View key={i} className="flex-row items-center gap-1 rounded-3xl bg-red-200 px-3 py-2">
                                <Feather name="plus-circle" size={14} color="#f97316"/>
                                <Text className="text-xs text-muted-foreground">{u}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {template.regionalPremiums && template.regionalPremiums.length > 0 && (
                    <View className="mb-5 px-6">
                        <Text className="mb-2 text-base font-bold text-foreground">Regional Premiums</Text>
                        {template.regionalPremiums.map((r, i) => (
                            <View key={i} className="mb-2 flex-row items-center rounded-xl bg-card p-4">
                                <Feather name="map-pin" size={14} color="#94A3B8"/>
                                <Text className="flex-1 text-xs text-muted-foreground">{r.region}</Text>
                                <Text className="text-xs font-bold text-primary">
                                    +{Math.round((r.multiplier - 1) * 100)}%
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                <View className="mb-5 px-4">
                    <Text className="mb-3 text-base font-bold text-foreground">Create Quote For</Text>
                    {clients.length === 0 ? (
                        <TouchableOpacity
                            className="flex-row items-center justify-center gap-2 rounded-lg border border-border bg-primary p-4"
                            onPress={() => router.push("/(tabs)/clients")}
                        >
                            <Feather name="plus" size={16} color="#fff"/>
                            <Text className="text-base font-semibold text-white">Add a client first</Text>
                        </TouchableOpacity>
                    ) : (
                        clients.map((c) => (
                            <TouchableOpacity
                                key={c.id}
                                className={cn(
                                    "mb-2 flex-row items-center justify-between gap-2 rounded-lg border p-4",
                                    selectedClientId === c.id ? "border-primary bg-secondary" : "border-zinc-200 bg-card",
                                )}
                                onPress={() => setSelectedClientId(c.id)}
                                activeOpacity={0.8}
                            >
                                <View className="h-11 w-11 items-center justify-center rounded-full">
                                    <Text className="text-base font-bold text-primary">{c.name.charAt(0)}</Text>
                                </View>
                                <View style={{flex: 1}}>
                                    <Text className="font-semibold">{c.name}</Text>
                                    {c.phone ? (
                                        <Text className="text-xs text-muted-foreground">{c.phone}</Text>
                                    ) : null}
                                </View>
                                {selectedClientId === c.id && (
                                    <Feather name="check-circle" size={20} color="#f97316"/>
                                )}
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            <View
                className="absolute bottom-0 left-0 right-0 z-10 flex-row items-center gap-4 bg-card px-5 pt-4 shadow"
                style={[{paddingBottom: Math.max(insets.bottom, 20)}]}
            >
                <View className="gap-1">
                    <Text className="text-xs font-semibold text-muted-foreground">Total</Text>
                    <Text className="text-2xl font-extrabold text-foreground">${total.toLocaleString()}</Text>
                </View>
                <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center gap-4 rounded-2xl bg-primary p-4"
                    onPress={handleCreateQuote}
                    activeOpacity={0.85}
                >
                    <Feather name="file-text" size={18} color="#fff"/>
                    <Text className="text-base font-bold text-white">Create Quote</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function HeroStat({icon, label, sub}: { icon: keyof typeof Feather.glyphMap; label: string; sub: string }) {
    return (
        <View className="flex-1 items-center gap-1">
            <Feather name={icon} size={16} color="#fff"/>
            <Text className="text-base font-bold text-white">{label}</Text>
            <Text className="text-xs text-zinc-300">{sub}</Text>
        </View>
    );
}
