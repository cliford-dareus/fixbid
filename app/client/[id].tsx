import {Feather} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {router, useLocalSearchParams} from "expo-router";
import React, {useEffect, useState} from "react";
import {
    Alert,
    Linking,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useQuote} from "@/context/quote-context";
import {supabase} from "@/lib/supabase";
import {cn} from "@/lib/utils";

export default function ClientDetailScreen() {
    const {id} = useLocalSearchParams<{id: string}>();
    const {clients, updateClient, deleteClient, quotes} = useQuote();
    const insets = useSafeAreaInsets();
    const client = clients.find((c) => c.id === id);

    const [editing, setEditing] = useState(false);
    const [clientJobs, setClientJobs] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState(client?.name ?? '');
    const [phone, setPhone] = useState(client?.phone ?? '');
    const [email, setEmail] = useState(client?.email ?? '');
    const [address, setAddress] = useState(client?.address ?? '');
    const [notes, setNotes] = useState(client?.notes ?? '');

    // Sync form when client loads / changes
    useEffect(() => {
        if (!client) return;
        setName(client.name ?? '');
        setPhone(client.phone ?? '');
        setEmail(client.email ?? '');
        setAddress(client.address ?? '');
        setNotes(client.notes ?? '');
    }, [client?.id]);

    const clientQuotes = quotes.filter((q) => q.client_id === id);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Name required');
            return;
        }
        if (!id) return;

        setSaving(true);
        try {
            await updateClient(id, {
                name: name.trim(),
                phone,
                email,
                address,
                notes,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setEditing(false);
        } catch {
            // alert handled in context
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!client) return;
        Alert.alert('Delete Client?', `This will remove ${client.name}.`, [
            {text: 'Cancel', style: 'cancel'},
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteClient(client.id);
                        router.back();
                    } catch {
                        // alert handled in context
                    }
                },
            },
        ]);
    };

    useEffect(() => {
        const fetchClientJobs = async () => {
            try {
                const {data, error} = await supabase
                    .from('jobs')
                    .select('*')
                    .eq('client_id', id);
                if (error) throw error;
                setClientJobs(data || []);
            } catch (error) {
                console.error('Error fetching client jobs:', error);
            }
        };
        if (id) fetchClientJobs();
    }, [id]);

    if (!client) {
        return (
            <View className="bg-background flex-1 items-center justify-center">
                <Text className="text-foreground">Client not found</Text>
            </View>
        );
    }

    const totalRevenue = clientJobs.reduce((s, j) => {
        const payments = Array.isArray(j.payments) ? j.payments : [];
        return s + payments.reduce((ps: number, p: any) => ps + (Number(p.amount) || 0), 0);
    }, 0);

    return (
        <View className="bg-background flex-1">
            <View
                className="flex-row items-center gap-3 px-4 pb-3"
                style={{paddingTop: insets.top + 12}}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Feather name="arrow-left" size={22} color="#111"/>
                </TouchableOpacity>

                <Text className="flex-1 text-[17px] font-bold" numberOfLines={1}>
                    {client.name}
                </Text>

                <TouchableOpacity
                    className={cn(
                        'rounded-[10px] px-3.5 py-2',
                        editing ? 'bg-primary' : 'bg-secondary',
                    )}
                    onPress={() => (editing ? handleSave() : setEditing(true))}
                    disabled={saving}
                >
                    <Text className={cn('text-sm font-bold', editing ? 'text-white' : 'text-primary')}>
                        {saving ? 'Saving…' : editing ? 'Save' : 'Edit'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerClassName="px-4 pb-24">
                <View className="bg-secondary-foreground mb-3 items-center gap-2 rounded-[20px] p-6">
                    <View className="bg-primary h-16 w-16 items-center justify-center rounded-full">
                        <Text className="text-white text-[28px] font-extrabold">
                            {client.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>

                    <Text className="text-[22px] font-bold text-white">{client.name}</Text>

                    <View className="mt-1 flex-row items-center gap-5">
                        <View className="items-center">
                            <Text className="text-[18px] font-bold text-white">{clientJobs.length}</Text>
                            <Text className="text-[11px] text-slate-400">Jobs</Text>
                        </View>

                        <View className="h-8 w-px bg-slate-700"/>

                        <View className="items-center">
                            <Text className="text-[18px] font-bold text-white">
                                ${totalRevenue.toLocaleString()}
                            </Text>
                            <Text className="text-[11px] text-slate-400">Revenue</Text>
                        </View>

                        <View className="h-8 w-px bg-slate-700"/>

                        <View className="items-center">
                            <Text className="text-[18px] font-bold text-white">{clientQuotes.length}</Text>
                            <Text className="text-[11px] text-slate-400">Quotes</Text>
                        </View>
                    </View>
                </View>

                {!editing && (client.phone || client.email) && (
                    <View className="mb-3 flex-row gap-2.5">
                        {client.phone ? (
                            <TouchableOpacity
                                className="bg-card flex-1 flex-row items-center justify-center gap-1.5 rounded-xl p-3"
                                onPress={() => Linking.openURL(`tel:${client.phone}`)}
                                activeOpacity={0.8}
                            >
                                <Feather name="phone" size={18} color="#3b82f6"/>
                                <Text className="text-primary text-sm font-semibold">Call</Text>
                            </TouchableOpacity>
                        ) : null}

                        {client.phone ? (
                            <TouchableOpacity
                                className="bg-card flex-1 flex-row items-center justify-center gap-1.5 rounded-xl p-3"
                                onPress={() => Linking.openURL(`sms:${client.phone}`)}
                                activeOpacity={0.8}
                            >
                                <Feather name="message-circle" size={18} color="#3b82f6"/>
                                <Text className="text-sm font-semibold text-primary">Text</Text>
                            </TouchableOpacity>
                        ) : null}

                        {client.email ? (
                            <TouchableOpacity
                                className="bg-card flex-1 flex-row items-center justify-center gap-1.5 rounded-xl p-3"
                                onPress={() => Linking.openURL(`mailto:${client.email}`)}
                                activeOpacity={0.8}
                            >
                                <Feather name="mail" size={18} color="#3b82f6"/>
                                <Text className="text-sm font-semibold text-primary">Email</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                )}

                {editing ? (
                    <View className="mb-3 rounded-2xl p-4 bg-card">
                        <Text className="mb-2 text-[14px] font-bold uppercase tracking-[0.5px] text-foreground">
                            Edit Contact
                        </Text>

                        {[
                            {label: 'Name *', value: name, onChange: setName, placeholder: 'Full name'},
                            {label: 'Phone', value: phone, onChange: setPhone, placeholder: '(555) 555-5555'},
                            {label: 'Email', value: email, onChange: setEmail, placeholder: 'email@example.com'},
                            {label: 'Address', value: address, onChange: setAddress, placeholder: '123 Main St...'},
                            {
                                label: 'Notes',
                                value: notes,
                                onChange: setNotes,
                                placeholder: 'Notes about this client...',
                            },
                        ].map((f) => (
                            <View key={f.label} className="mb-2.5 gap-1">
                                <Text className="text-[12px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">
                                    {f.label}
                                </Text>
                                <TextInput
                                    className="text-foreground rounded-[10px] border border-zinc-300 px-3 py-2.5 text-[15px]"
                                    value={f.value}
                                    onChangeText={f.onChange}
                                    placeholder={f.placeholder}
                                />
                            </View>
                        ))}

                        <TouchableOpacity onPress={handleDelete} className="mt-1 flex-row items-center gap-2 pt-2">
                            <Feather name="trash-2" size={16} color="red"/>
                            <Text className="text-sm font-semibold text-destructive">Delete Client</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="mb-3 rounded-2xl p-4 bg-card">
                        <Text className="text-foreground mb-2 text-[14px] font-bold uppercase tracking-[0.5px]">
                            Contact Info
                        </Text>

                        {[
                            {icon: 'phone' as const, label: client.phone || '—'},
                            {icon: 'mail' as const, label: client.email || '—'},
                            {icon: 'map-pin' as const, label: client.address || '—'},
                        ].map((item) => (
                            <View key={item.icon} className="flex-row items-center gap-2.5 py-2">
                                <Feather name={item.icon} size={16} color="#6b7280"/>
                                <Text className="flex-1 text-[15px] text-foreground">{item.label}</Text>
                            </View>
                        ))}

                        {client.notes ? (
                            <View className="flex-row items-center gap-2.5 py-2">
                                <Feather name="file-text" size={16} color="#6b7280"/>
                                <Text className="flex-1 text-[15px] text-foreground">{client.notes}</Text>
                            </View>
                        ) : null}
                    </View>
                )}

                <TouchableOpacity
                    className="bg-primary mb-5 flex-row items-center justify-center gap-2 rounded-2xl p-3.5"
                    onPress={() => router.push('/quote/new')}
                    activeOpacity={0.85}
                >
                    <Feather name="plus" size={16} color="#fff"/>
                    <Text className="text-[15px] font-bold text-white">New Quote for {client.name}</Text>
                </TouchableOpacity>

                {clientJobs.length > 0 && (
                    <View className="gap-2">
                        <Text className="text-[14px] font-bold uppercase tracking-[0.5px] text-foreground">
                            Job History
                        </Text>

                        {clientJobs.map((j) => (
                            <TouchableOpacity
                                key={j.id}
                                className="bg-card flex-row items-center justify-between rounded-xl p-3.5"
                                activeOpacity={0.8}
                            >
                                <View className="flex-1 gap-0.5">
                                    <Text className="text-foreground text-[15px] font-semibold" numberOfLines={1}>
                                        {j.job_name || j.jobName}
                                    </Text>
                                    <Text className="text-muted-foreground text-[12px]">
                                        {j.schedule_date || j.scheduled_date
                                            ? formatDate(j.schedule_date || j.scheduled_date)
                                            : 'No date'}
                                    </Text>
                                </View>

                                <View className="items-end gap-1">
                                    <Text className="text-foreground text-[14px] font-bold">
                                        ${Number(j.total_amount || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}
