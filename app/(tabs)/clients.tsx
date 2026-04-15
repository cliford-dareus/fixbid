import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    FlatList,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { EmptyState } from "@/components/EmptyState";

import {Client, useQuote} from "@/context/quote-context";

export default function ClientsScreen() {
    const insets = useSafeAreaInsets();
    const { clients } = useQuote();
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

    const filtered = clients.filter(
        (c) =>
            !search ||
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.phone.includes(search) ||
            c.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = (c: Client) => {
        Alert.alert("Delete Client", `Remove ${c.name}?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    // deleteClient(c.id);
                },
            },
        ]);
    };

    return (
        <View className="flex-1 bg-background">
            <View className="flex-row items-center justify-between px-5 pb-3" style={{ paddingTop: topPad + 16 }}>
                <Text className="text-foreground text-[26px] font-extrabold tracking-[-0.5px]">
                    Clients
                </Text>
                <TouchableOpacity
                    className="bg-primary h-[38px] w-[38px] items-center justify-center rounded-[12px]"
                    onPress={() => setShowAdd(true)}
                    activeOpacity={0.85}
                >
                    <Feather name="plus" size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            <View className="mb-2 px-5">
                <View
                    className="bg-card flex-row items-center gap-2.5 rounded-[12px] border px-3.5 py-2.5"
                >
                    <Feather name="search" size={16} color="muted.foreground" />
                    <TextInput
                        className="text-foreground flex-1 text-[15px]"
                        placeholder="Search clients..."
                        // placeholderTextColor={colors.mutedForeground}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {clients.length === 0 ? (
                // <EmptyState
                //     icon="users"
                //     title="No clients yet"
                //     subtitle="Add your first client to start tracking jobs and quotes."
                //     actionLabel="Add Client"
                //     onAction={() => setShowAdd(true)}
                // />

                <View className="flex-1 items-center justify-center"></View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(c) => c.id}
                    contentContainerClassName="px-4 pt-3 pb-24"
                    renderItem={({ item }) => {
                        // const jobCount = getClientJobs(item.id).length;
                        return (
                            <TouchableOpacity
                                className="bg-card mb-2 flex-row items-center gap-3 rounded-[14px] p-3.5"
                                // onPress={() => router.push(`/client/${item.id}`)}
                                onLongPress={() => handleDelete(item)}
                                activeOpacity={0.8}
                            >
                                <View
                                    className="bg-primary h-11 w-11 items-center justify-center rounded-full"
                                >
                                    <Text className="text-primary text-[18px] font-bold">
                                        {item.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>

                                <View className="flex-1 gap-0.5">
                                    <Text className="text-[16px] font-semibold text-foreground">
                                        {item.name}
                                    </Text>
                                    <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
                                        {item.phone || item.email || "No contact info"}
                                    </Text>
                                </View>

                                {/*<View className="flex-row items-center gap-2">*/}
                                {/*    {jobCount > 0 && (*/}
                                {/*        <View className="rounded-full px-2 py-[3px] bg-secondary">*/}
                                {/*            <Text className="text-[11px] font-semibold text-primary">*/}
                                {/*                {jobCount} job{jobCount !== 1 ? "s" : ""}*/}
                                {/*            </Text>*/}
                                {/*        </View>*/}
                                {/*    )}*/}
                                {/*    <Feather name="chevron-right" size={16} color="" />*/}
                                {/*</View>*/}
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <View className="items-center pt-10">
                            <Text className="text-[15px] text-muted-foreground">
                                No clients match your search
                            </Text>
                        </View>
                    }
                />
            )}

            {showAdd && <AddClientModal onClose={() => setShowAdd(false)} colors="" />}
        </View>
    );
}

function AddClientModal({
                            onClose,
                            colors,
                        }: {
    onClose: () => void;
    colors: any;
}) {
    // const { addClient } = useQuote();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert("Name required");
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // const client = addClient({ name: name.trim(), phone, email, address, notes });
        onClose();
        // router.push(`/client/${client.id}`);
    };

    return (
        <View className="bg-white absolute inset-0 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 999 }}>
            <TouchableOpacity className="flex-1" onPress={onClose} activeOpacity={1} />
            <View
                className="gap-3.5 rounded-t-[24px] p-6 bg-card"
                style={{
                    paddingBottom: Math.max(insets.bottom, 24),
                }}
            >
                <View className="mb-1 h-1 w-9 self-center rounded-full" style={{ backgroundColor: "#D1D5DB" }} />
                <Text className="text-foreground text-[20px] font-bold">
                    New Client
                </Text>

                {[
                    { label: "Name *", value: name, onChange: setName, placeholder: "John Smith" },
                    { label: "Phone", value: phone, onChange: setPhone, placeholder: "(555) 555-5555" },
                    { label: "Email", value: email, onChange: setEmail, placeholder: "john@email.com" },
                    { label: "Address", value: address, onChange: setAddress, placeholder: "123 Main St..." },
                    { label: "Notes", value: notes, onChange: setNotes, placeholder: "Optional notes..." },
                ].map((field) => (
                    <View key={field.label} className="gap-1">
                        <Text
                            className="text-[12px] font-semibold uppercase tracking-[0.5px]"
                            style={{ color: colors.mutedForeground }}
                        >
                            {field.label}
                        </Text>
                        <TextInput
                            className="rounded-[10px] border px-3 py-2.5 text-[15px]"
                            style={{
                                backgroundColor: colors.background,
                                color: colors.foreground,
                                borderColor: colors.border,
                            }}
                            value={field.value}
                            onChangeText={field.onChange}
                            placeholder={field.placeholder}
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>
                ))}

                <View className="mt-1 flex-row gap-2.5">
                    <TouchableOpacity
                        className="flex-1 items-center rounded-[12px] border p-3.5"
                        style={{ borderColor: colors.border }}
                        onPress={onClose}
                    >
                        <Text className="text-[15px] font-semibold" style={{ color: colors.foreground }}>
                            Cancel
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-[2] items-center rounded-[12px] p-3.5"
                        style={{ backgroundColor: colors.primary }}
                        onPress={handleSave}
                    >
                        <Text className="text-[15px] font-bold text-white">Save Client</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}