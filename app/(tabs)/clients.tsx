import {Feather} from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, {useState} from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BlurView} from 'expo-blur';
import {Client, useQuote} from '@/context/quote-context';
import useThemedNavigation from '@/hooks/use-navigation-theme';
import {router} from 'expo-router';
import {Button, EmptyState, Input} from '@/components/ui';

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const {clients, deleteClient} = useQuote();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const {isDark, isWeb, isIOS, colors} = useThemedNavigation();

  const filtered = clients.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase()?.includes(search?.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase()?.includes(search?.toLowerCase()),
  );

  const handleDelete = (c: Client) => {
    Alert.alert('Delete Client', `Remove ${c.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
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
      <View className="absolute top-14 h-[60px] w-full flex-row items-center justify-between px-6">
        <TouchableOpacity className="z-50 h-12 w-12 flex-row items-center justify-center rounded-full border border-zinc-300 bg-secondary-foreground">
          <Feather name="user" size={24} color="white" />
        </TouchableOpacity>

        <View className="z-50 flex-row gap-2 rounded-full bg-secondary-foreground px-2 py-[3px]">
          <TouchableOpacity
            className="h-12 w-12 flex-row items-center justify-center rounded-full bg-secondary-foreground"
            onPress={() => setShowAdd(true)}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {isIOS ? (
          <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} className="absolute inset-0" />
        ) : isWeb ? (
          <View className="absolute inset-0 bg-background" />
        ) : null}
      </View>

      <View
        className="flex-row items-center justify-between px-5 pb-3"
        style={{paddingTop: topPad + 16}}
      >
        <Text className="text-[26px] font-extrabold tracking-[-0.5px] text-foreground">
          Clients
        </Text>
      </View>

      <View className="mb-2 px-5">
        <View className="flex-row items-center gap-2.5 rounded-[12px] border border-zinc-300 bg-card px-3.5 py-2.5">
          <Feather name="search" size={16} color={colors.mutedForeground || '#9ca3af'} />
          <TextInput
            className="flex-1 text-[15px] text-foreground"
            placeholder="Search clients..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {clients.length === 0 ? (
        <EmptyState
          icon="users"
          title="No clients yet"
          subtitle="Add your first client to start tracking jobs and quotes."
          actionLabel="Add Client"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerClassName="px-4 pt-3 pb-24"
          renderItem={({item}) => (
            <TouchableOpacity
              className="mb-2 flex-row items-center gap-3 rounded-[14px] bg-card p-3.5"
              onPress={() => router.push(`/client/${item.id}`)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.8}
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
                <Text className="text-[18px] font-bold text-white">
                  {(item.name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>

              <View className="flex-1 gap-0.5">
                <Text className="text-[16px] font-semibold text-foreground">{item.name}</Text>
                <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
                  {item.phone || item.email || 'No contact info'}
                </Text>
              </View>

              <Feather name="chevron-right" size={16} color={colors.mutedForeground || '#9ca3af'} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              variant="card"
              icon="search"
              title="No matches"
              subtitle="No clients match your search."
              className="mt-8"
            />
          }
        />
      )}

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}
    </View>
  );
}

function AddClientModal({onClose}: {onClose: () => void}) {
  const {addClient} = useQuote();
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
      <TouchableOpacity className="flex-1" onPress={onClose} activeOpacity={1} />
      <View
        className="gap-3.5 rounded-t-[24px] bg-card p-6"
        style={{paddingBottom: Math.max(insets.bottom, 100)}}
      >
        <View className="mb-1 h-1 w-9 self-center rounded-full bg-zinc-300" />
        <Text className="text-[20px] font-bold text-foreground">New Client</Text>

        <Input label="Name *" value={name} onChangeText={setName} placeholder="John Smith" />
        <Input
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="(555) 555-5555"
          keyboardType="phone-pad"
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="john@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main St..."
        />
        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes..." />

        <View className="mt-1 flex-row gap-2.5">
          <Button
            title="Cancel"
            variant="outline"
            className="flex-1"
            onPress={onClose}
            disabled={saving}
          />
          <Button
            title="Save Client"
            className="flex-[2]"
            loading={saving}
            onPress={handleSave}
          />
        </View>
      </View>
    </View>
  );
}
