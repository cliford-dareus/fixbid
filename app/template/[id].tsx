import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {calculateJobCost, getTemplateById} from "@/data/templates";
import {useQuote} from "@/context/quote-context";

export default function TemplateDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const template = getTemplateById(id ?? "");
    const insets = useSafeAreaInsets();
    const {addQuote } = useQuote();
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
        // const client = clients.find((c) => c.id === selectedClientId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const quote = addQuote({
            clientId: selectedClientId,
            clientName: "",
            templateId: template.id,
            jobName: template.name,
            lineItems: [
                {
                    id: "",
                    description: `Labor - ${template.name} (${template.timeEstimateHours * qtyNum}h @ $${template.laborRate}/hr)`,
                    quantity: 1,
                    unitPrice: template.timeEstimateHours * template.laborRate * qtyNum,
                    isLabor: true
                },
                ...template.materials
                    .filter((m) => m.qty > 0)
                    .map((m) => ({
                        id: "",
                        description: m.name,
                        quantity: m.qty * qtyNum,
                        unitPrice: m.avgCost * (1 + parseFloat(markup || "20") / 100),
                        isLabor: true
                    })),
            ],
            notes: `Generated from template: ${template.name}\nCommon upsells: ${template.commonUpsells.join(", ")}`,
            total,
            status: "draft" as const,
            photos: [],
        });
        router.push(`/quotes/${quote.id}`);
    };

    return (
        <View className="flex-1 bg-background">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 160 }}
            >
                {/* Header */}
                <View className="flex p-6 pt-16 gap-4 bg-secondary-foreground">
                    <TouchableOpacity
                        style={{
                            marginTop: 8,
                        }}
                        onPress={() => router.back()}
                    >
                        <Feather name="arrow-left" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View className="self-start px-4 py-2 rounded-3xl bg-primary/20">
                        <Text className="text-xs font-bold text-primary" style={{textTransform: 'uppercase'}}>
                            {template.category}
                        </Text>
                    </View>
                    <Text className="text-white text-2xl font-extrabold tracking-tighter">{template.name}</Text>
                    <Text className="text-xs leading-5" style={[{ color: "#94A3B8" }]}>{template.description}</Text>
                    <View className="flex-row flex-1 items-center gap-none mt-3">
                        <HeroStat icon="clock" label={`${template.timeEstimateHours}h`} sub="Est. time" />
                        <HeroStat icon="dollar-sign" label={`$${template.laborRate}/hr`} sub="Labor rate" />
                        <HeroStat icon="tag" label={`$${cost.suggested}`} sub="Suggested" />
                    </View>
                </View>

                {/* Quantity & Markup */}
                <View className="rounded-2xl p-4 gap-3" style={{ margin: 16 }}>
                    <Text className="text-foreground text-base font-bold">Job Settings</Text>
                    <View className="flex-row gap-3">
                        <View className="flex-1 gap-2">
                            <Text className="text-muted-foreground font-semibold text-xs">Quantity / Units</Text>
                            <TextInput
                                className="text-foreground border border-zinc-300 rounded-lg px-4 py-2 text-base"
                                value={qty}
                                onChangeText={setQty}
                                keyboardType="number-pad"
                            />
                        </View>
                        <View className="flex-1 gap-2">
                            <Text className="text-muted-foreground font-semibold text-xs">Material Markup %</Text>
                            <TextInput
                                className="text-foreground border border-zinc-300 rounded-lg px-4 py-2 text-base"
                                value={markup}
                                onChangeText={setMarkup}
                                keyboardType="number-pad"
                            />
                        </View>
                    </View>
                    <View className="flex-row items-center justify-between p-4 rounded-xl bg-primary/20">
                        <Text className="text-muted-foreground text-xs font-semibold">Quote Total</Text>
                        <Text className="text-primary font-extrabold text-2xl tracking-tighter">${total.toLocaleString()}</Text>
                    </View>
                </View>

                {/* Materials */}
                <View className="px-6 mb-5">
                    <Text className="text-foreground text-base font-bold mb-3">Materials</Text>
                    {template.materials.map((m, i) => (
                        <View key={i} className="flex-row items-center justify-between py-2">
                            <View className="gap-1">
                                <Text className="text-[15px] font-bold text-foreground">{m.name}</Text>
                                <Text className="text-muted-foreground text-xs font-semibold">
                                    {m.qty > 0 ? `${m.qty * qtyNum} ${m.unit}` : "as needed"}
                                </Text>
                            </View>
                            <Text className="text-foreground font-bold text-base">
                                {m.qty > 0 ? `$${(m.avgCost * m.qty * qtyNum).toFixed(2)}` : "—"}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Upsells */}
                <View className="px-6 mb-5">
                    <Text className="text-foreground text-base font-bold mb-2">Common Upsells</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {template.commonUpsells.map((u, i) => (
                            <View key={i} className="flex-row items-center gap-1 rounded-3xl px-3 py-2 bg-red-200">
                                <Feather name="plus-circle" size={14} color="#f97316"/>
                                <Text className="text-muted-foreground text-xs">{u}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Regional Premiums */}
                {template.regionalPremiums && template.regionalPremiums.length > 0 && (
                    <View className="px-6 mb-5">
                        <Text className="text-foreground text-base font-bold mb-2">Regional Premiums</Text>
                        {template.regionalPremiums.map((r, i) => (
                            <View key={i} className="bg-card flex-row items-center rounded-xl p-4 mb-2">
                                <Feather name="map-pin" size={14} color="#94A3B8" />
                                <Text className="flex-1 text-xs text-muted-foreground">{r.region}</Text>
                                <Text className="text-primary text-xs font-bold">
                                    +{Math.round((r.multiplier - 1) * 100)}%
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Client Select */}
                {/*<View className="px-4 mb-5">*/}
                {/*    <Text className="text-foreground font-bold text-base mb-3">Create Quote For</Text>*/}
                {/*    {clients.length === 0 ? (*/}
                {/*        <TouchableOpacity*/}
                {/*            className="bg-primary flex-row items-center justify-center gap-2 rounded-lg border border-border p-4"*/}
                {/*            onPress={() => router.push("/(tabs)/clients")}*/}
                {/*        >*/}
                {/*            <Feather name="plus" size={16} color="primary" />*/}
                {/*            <Text className="font-semibold text-base text-primary">*/}
                {/*                Add a client first*/}
                {/*            </Text>*/}
                {/*        </TouchableOpacity>*/}
                {/*    ) : (*/}
                {/*        clients.map((c) => (*/}
                {/*            <TouchableOpacity*/}
                {/*                key={c.id}*/}
                {/*                className="flex-row items-center justify-between gap-2 rounded-lg border border-border p-4 mb-2"*/}
                {/*                style={[*/}
                {/*                    {*/}
                {/*                        backgroundColor:*/}
                {/*                            selectedClientId === c.id ? colors.secondary : colors.card,*/}
                {/*                        borderColor:*/}
                {/*                            selectedClientId === c.id ? colors.primary : colors.border,*/}
                {/*                    },*/}
                {/*                ]}*/}
                {/*                onPress={() => setSelectedClientId(c.id)}*/}
                {/*                activeOpacity={0.8}*/}
                {/*            >*/}
                {/*                <View className="w-11 h-11 rounded-full items-center justify-center">*/}
                {/*                    <Text className="font-bold text-base text-primary">*/}
                {/*                        {c.name.charAt(0)}*/}
                {/*                    </Text>*/}
                {/*                </View>*/}
                {/*                <View style={{ flex: 1 }}>*/}
                {/*                    <Text className="font-semibold">{c.name}</Text>*/}
                {/*                    {c.phone ? (*/}
                {/*                        <Text className="text-xs text-muted-foreground">*/}
                {/*                            {c.phone}*/}
                {/*                        </Text>*/}
                {/*                    ) : null}*/}
                {/*                </View>*/}
                {/*                {selectedClientId === c.id && (*/}
                {/*                    <Feather name="check-circle" size={20} color="primary" />*/}
                {/*                )}*/}
                {/*            </TouchableOpacity>*/}
                {/*        ))*/}
                {/*    )}*/}
                {/*</View>*/}
            </ScrollView>

            {/* CTA */}
            <View
                className="bg-card absolute bottom-0 left-0 right-0 z-10 flex-row items-center pt-4 gap-4 px-5 shadow"
                style={[
                    { paddingBottom: Math.max(insets.bottom, 20) },
                ]}
            >
                <View className="gap-1">
                    <Text className="text-muted-foreground text-xs font-semibold">Total</Text>
                    <Text className="text-foreground text-2xl font-extrabold">${total.toLocaleString()}</Text>
                </View>
                <TouchableOpacity
                    className="bg-primary flex-1 flex-row items-center justify-center gap-4 p-4 rounded-2xl"
                    // onPress={handleCreateQuote}
                    activeOpacity={0.85}
                >
                    <Feather name="file-text" size={18} color="#fff" />
                    <Text className="text-white text-base font-bold" >Create Quote</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function HeroStat({ icon, label, sub }: { icon: keyof typeof Feather.glyphMap; label: string; sub: string }) {
    return (
        <View className="flex-1 items-center gap-1">
            <Feather name={icon} size={16} color="#fff" />
            <Text className="text-white text-base font-bold">{label}</Text>
            <Text className="text-zinc-300 text-xs">{sub}</Text>
        </View>
    );
}