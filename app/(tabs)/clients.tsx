import {Feather} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, {useState} from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {BlurView} from "expo-blur";
import {Client, useQuote} from "@/context/quote-context";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import {router} from "expo-router";

export default function ClientsScreen() {
    const insets = useSafeAreaInsets();
    const {clients, deleteClient} = useQuote();
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
    const {isDark, isWeb, isIOS, colors} = useThemedNavigation();

    const filtered = clients.filter(
        (c) =>
            !search ||
            c.name?.toLowerCase()?.includes(search?.toLowerCase()) ||
            c.phone?.includes(search) ||
            c.email?.toLowerCase()?.includes(search?.toLowerCase()),
    );

    const handleDelete = (c: Client) => {
        Alert.alert("Delete Client", `Remove ${c.name}?`, [
            {text: "Cancel", style: "cancel"},
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteClient(c.id);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    } catch {
                        // error alert handled in context
                    }
                },
            },
        ]);
    };

    return (
        <View className="flex-1 bg-background pt-[40px]">
            <View className="absolute top-14 h-[60px] w-full flex-row justify-between items-center px-6">
                <TouchableOpacity
                    className="bg-secondary-foreground w-12 h-12 rounded-full flex-row items-center justify-center border border-zinc-300 z-50">
                    <Feather name="user" size={24} color="white"/>
                </TouchableOpacity>

                <View className="flex-row gap-2 bg-secondary-foreground rounded-full px-2 py-[3px] z-50">
                    <TouchableOpacity
                        className="bg-secondary-foreground w-12 h-12 rounded-full flex-row items-center justify-center"
                        onPress={() => setShowAdd(true)}
                        activeOpacity={0.85}
                    >
                        <Feather name="plus" size={18} color="#fff"/>
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

            <View className="flex-row items-center justify-between px-5 pb-3" style={{paddingTop: topPad + 16}}>
                <Text className="text-foreground text-[26px] font-extrabold tracking-[-0.5px]">
                    Clients
                </Text>
            </View>

            <View className="mb-2 px-5">
                <View className="bg-card flex-row items-center gap-2.5 rounded-[12px] border border-zinc-300 px-3.5 py-2.5">
                    <Feather name="search" size={16} color={colors.mutedForeground || "#9ca3af"}/>
                    <TextInput
                        className="text-foreground flex-1 text-[15px]"
                        placeholder="Search clients..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {clients.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8 gap-3">
                    <Feather name="users" size={40} color={colors.mutedForeground || "#9ca3af"}/>
                    <Text className="text-foreground text-lg font-semibold text-center">No clients yet</Text>
                    <Text className="text-muted-foreground text-sm text-center">
                        Add your first client to start tracking jobs and quotes.
                    </Text>
                    <TouchableOpacity
                        className="bg-primary mt-2 rounded-xl px-5 py-3"
                        onPress={() => setShowAdd(true)}
                    >
                        <Text className="text-white font-bold">Add Client</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(c) => c.id}
                    contentContainerClassName="px-4 pt-3 pb-24"
                    renderItem={({item}) => (
                        <TouchableOpacity
                            className="bg-card mb-2 flex-row items-center gap-3 rounded-[14px] p-3.5"
                            onPress={() => router.push(`/client/${item.id}`)}
                            onLongPress={() => handleDelete(item)}
                            activeOpacity={0.8}
                        >
                            <View className="bg-primary h-11 w-11 items-center justify-center rounded-full">
                                <Text className="text-white text-[18px] font-bold">
                                    {(item.name || '?').charAt(0).toUpperCase()}
                                </Text>
                            </View>

                            <View className="flex-1 gap-0.5">
                                <Text className="text-[16px] font-semibold text-foreground">
                                    {item.name}
                                </Text>
                                <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
                                    {item.phone || item.email || 'No contact info'}
                                </Text>
                            </View>

                            <Feather name="chevron-right" size={16} color={colors.mutedForeground || "#9ca3af"}/>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View className="items-center pt-10">
                            <Text className="text-[15px] text-muted-foreground">
                                No clients match your search
                            </Text>
                        </View>
                    }
                />
            )}

            {showAdd && <AddClientModal onClose={() => setShowAdd(false)}/>}
        </View>
    );
}

function AddClientModal({onClose}: {onClose: () => void}) {
    const {addClient} = useQuote();
    const {colors} = useThemedNavigation();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Name required');
            return;
        }
        setSaving(true);
        try {
            const client = await addClient({
                name: name.trim(),
                phone,
                email,
                address,
                notes,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose();
            router.push(`/client/${client.id}`);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save client');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View
            className="absolute inset-0 justify-end"
            style={{backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999}}
        >
            <TouchableOpacity className="flex-1" onPress={onClose} activeOpacity={1}/>
            <View
                className="gap-3.5 rounded-t-[24px] p-6 bg-card"
                style={{paddingBottom: Math.max(insets.bottom, 100)}}
            >
                <View className="mb-1 h-1 w-9 self-center rounded-full" style={{backgroundColor: '#D1D5DB'}}/>
                <Text className="text-foreground text-[20px] font-bold">New Client</Text>

                {[
                    {label: 'Name *', value: name, onChange: setName, placeholder: 'John Smith'},
                    {label: 'Phone', value: phone, onChange: setPhone, placeholder: '(555) 555-5555'},
                    {label: 'Email', value: email, onChange: setEmail, placeholder: 'john@email.com'},
                    {label: 'Address', value: address, onChange: setAddress, placeholder: '123 Main St...'},
                    {label: 'Notes', value: notes, onChange: setNotes, placeholder: 'Optional notes...'},
                ].map((field) => (
                    <View key={field.label} className="gap-1">
                        <Text
                            className="text-[12px] font-semibold uppercase tracking-[0.5px] text-muted-foreground"
                        >
                            {field.label}
                        </Text>
                        <TextInput
                            className="rounded-[10px] border border-zinc-300 px-3 py-2.5 text-[15px] text-foreground bg-background"
                            value={field.value}
                            onChangeText={field.onChange}
                            placeholder={field.placeholder}
                            placeholderTextColor={colors.mutedForeground || '#9ca3af'}
                        />
                    </View>
                ))}

                <View className="mt-1 flex-row gap-2.5">
                    <TouchableOpacity
                        className="flex-1 items-center rounded-[12px] border border-zinc-300 p-3.5"
                        onPress={onClose}
                        disabled={saving}
                    >
                        <Text className="text-[15px] font-semibold text-foreground">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-[2] items-center rounded-[12px] p-3.5 bg-primary"
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff"/>
                        ) : (
                            <Text className="text-[15px] font-bold text-white">Save Client</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
