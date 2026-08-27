import React, {useEffect, useState} from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {router} from 'expo-router';
import useThemedNavigation from '@/hooks/use-navigation-theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SectionCard} from '@/app/settings/profile';
import {Feather} from '@expo/vector-icons';
import {useProfile} from '@/context/profile-context';
import {useAuth} from '@/context/auth-context';
import {useTheme} from '@/hooks/use-theme';
import type {ThemePreference} from '@/context/theme-context';
import {displayBusinessName} from '@/lib/branding';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_KEY = 'fixbid_notifications_enabled_v1';

function SettingsRow({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
  colors,
  right,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  colors: ReturnType<typeof useThemedNavigation>['colors'];
  right?: React.ReactNode;
}) {
  const content = (
    <View className="flex-row items-center gap-3 py-1">
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{backgroundColor: iconBg}}
      >
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-foreground text-[15px] font-semibold">{title}</Text>
        {subtitle ? (
          <Text className="text-muted-foreground mt-0.5 text-xs" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ??
        (onPress ? (
          <Feather name="chevron-right" size={18} color={colors.icon} />
        ) : null)}
    </View>
  );

  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      {content}
    </TouchableOpacity>
  );
}

function ThemeOption({
  label,
  icon,
  value,
  selected,
  onSelect,
  colors,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  value: ThemePreference;
  selected: boolean;
  onSelect: (v: ThemePreference) => void;
  colors: ReturnType<typeof useThemedNavigation>['colors'];
}) {
  return (
    <TouchableOpacity
      onPress={() => onSelect(value)}
      activeOpacity={0.85}
      className={`flex-1 items-center gap-2 rounded-2xl border px-2 py-3 ${
        selected ? 'border-primary bg-primary/10' : 'border-zinc-200 dark:border-zinc-700'
      }`}
      style={{
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? 'rgba(249, 115, 22, 0.12)' : colors.lightDark,
      }}
    >
      <Feather name={icon} size={20} color={selected ? colors.primary : colors.icon} />
      <Text
        className="text-[13px] font-semibold"
        style={{color: selected ? colors.primary : colors.foreground}}
      >
        {label}
      </Text>
      {selected ? (
        <View className="absolute right-2 top-2">
          <Feather name="check-circle" size={14} color={colors.primary} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function SettingsModal() {
  const {user, signOut} = useAuth();
  const {colors, isDark} = useThemedNavigation();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const {profile} = useProfile();
  const {preference, setPreference, theme} = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((v) => {
      if (v === '0') setNotificationsEnabled(false);
      if (v === '1') setNotificationsEnabled(true);
    });
  }, []);

  const onToggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
    AsyncStorage.setItem(NOTIF_KEY, value ? '1' : '0').catch(() => {});
  };

  const displayName =
    displayBusinessName(profile) !== 'Professional Handyman'
      ? displayBusinessName(profile)
      : profile?.full_name || user?.email || 'Your account';

  const initials = (displayName || 'FB')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not sign out');
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background" style={{paddingTop: topPad + 8}}>
      <View className="mb-2 flex-row items-center justify-between px-5">
        <View className="flex-1">
          <Text className="text-foreground text-[26px] font-extrabold tracking-[-0.5px]">
            Settings
          </Text>
          <Text className="text-muted-foreground mt-0.5 text-[13px]">
            Account, payments, and appearance
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-secondary"
          accessibilityLabel="Close settings"
        >
          <Feather name="x" size={20} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: insets.bottom + 40}}
      >
        <SectionCard title="Account" colors={colors}>
          <TouchableOpacity
            onPress={() => router.push('/settings/profile')}
            className="w-full flex-row items-center gap-3"
            activeOpacity={0.8}
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Text className="text-[15px] font-extrabold text-white">{initials}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-foreground text-[16px] font-semibold" numberOfLines={1}>
                {displayName}
              </Text>
              <Text className="text-muted-foreground text-[13px]" numberOfLines={1}>
                {user?.email || 'Update your profile info'}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.icon} />
          </TouchableOpacity>
        </SectionCard>

        <SectionCard title="Payments" colors={colors}>
          <SettingsRow
            icon="dollar-sign"
            iconBg="rgba(249, 115, 22, 0.15)"
            title="Set up payouts"
            subtitle="Choose how you get paid — debit card or bank"
            onPress={() => router.push('/settings/payment-setup')}
            colors={colors}
          />
        </SectionCard>

        <SectionCard title="Appearance" colors={colors}>
          <Text className="text-muted-foreground mb-3 text-xs">
            Current: {theme === 'dark' ? 'Dark' : 'Light'}
            {preference === 'system' ? ' (following system)' : ''}
          </Text>
          <View className="flex-row gap-2">
            <ThemeOption
              label="Light"
              icon="sun"
              value="light"
              selected={preference === 'light'}
              onSelect={setPreference}
              colors={colors}
            />
            <ThemeOption
              label="Dark"
              icon="moon"
              value="dark"
              selected={preference === 'dark'}
              onSelect={setPreference}
              colors={colors}
            />
            <ThemeOption
              label="System"
              icon="smartphone"
              value="system"
              selected={preference === 'system'}
              onSelect={setPreference}
              colors={colors}
            />
          </View>
        </SectionCard>

        <SectionCard title="Notifications" colors={colors}>
          <SettingsRow
            icon="bell"
            iconBg={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'}
            title="Push notifications"
            subtitle="Job updates and payment alerts"
            colors={colors}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={onToggleNotifications}
                trackColor={{false: colors.border, true: colors.primary}}
                thumbColor="#fff"
              />
            }
          />
        </SectionCard>

        <SectionCard title="Support" colors={colors}>
          <SettingsRow
            icon="help-circle"
            iconBg={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'}
            title="Help & feedback"
            subtitle="Email support@fixbid.app"
            onPress={() => {
              Alert.alert(
                'Help',
                'For support, email support@fixbid.app or message us in-app when chat ships.',
              );
            }}
            colors={colors}
          />
        </SectionCard>

        <View className="mx-4 mt-2">
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.85}
            className="flex-row items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-3.5 dark:border-red-900 dark:bg-red-950/40"
          >
            <Feather name="log-out" size={18} color="#b91c1c" />
            <Text className="text-[15px] font-bold text-red-700">Sign out</Text>
          </TouchableOpacity>
          {user?.email ? (
            <Text className="text-muted-foreground mt-3 text-center text-xs">{user.email}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
