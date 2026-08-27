import {Feather} from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import useThemedNavigation from '@/hooks/use-navigation-theme';
import useThemeColors from '@/hooks/use-theme-color';
import {useProfile} from '@/context/profile-context';
import type {Profile as DomainProfile} from '@/lib/data';
import {displayBusinessName, displayLocation} from '@/lib/branding';

/** Form model (camelCase) mapped to Supabase Profile. */
interface FormProfile {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  licenseNumber: string;
  insuranceInfo: string;
  defaultLaborRate: string;
  defaultMaterialMarkup: string;
  defaultTaxRate: string;
  paymentNote: string;
  website: string;
  tagline: string;
}

const EMPTY_FORM: FormProfile = {
  businessName: '',
  ownerName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  licenseNumber: '',
  insuranceInfo: '',
  defaultLaborRate: '85',
  defaultMaterialMarkup: '20',
  defaultTaxRate: '0',
  paymentNote:
    'Payment due upon job completion. Venmo, Zelle, cash, or check accepted.',
  website: '',
  tagline: '',
};

function domainToForm(p: DomainProfile | null): FormProfile {
  if (!p) return {...EMPTY_FORM};
  return {
    businessName: p.business_name || '',
    ownerName: p.full_name || '',
    phone: p.phone || '',
    email: p.email || '',
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    zip: p.zip || '',
    licenseNumber: p.license_number || '',
    insuranceInfo: p.insurance_info || '',
    defaultLaborRate: String(p.hourly_rate || 85),
    defaultMaterialMarkup: String(p.default_material_markup ?? 20),
    defaultTaxRate: String(p.default_tax_rate ?? 0),
    paymentNote: p.payment_note || EMPTY_FORM.paymentNote,
    website: p.website || '',
    tagline: p.tagline || '',
  };
}

function formToDomain(f: FormProfile): Partial<DomainProfile> {
  return {
    business_name: f.businessName.trim(),
    full_name: f.ownerName.trim(),
    phone: f.phone.trim(),
    email: f.email.trim(),
    address: f.address.trim(),
    city: f.city.trim(),
    state: f.state.trim(),
    zip: f.zip.trim(),
    license_number: f.licenseNumber.trim(),
    insurance_info: f.insuranceInfo.trim(),
    hourly_rate: parseFloat(f.defaultLaborRate) || 0,
    default_material_markup: parseFloat(f.defaultMaterialMarkup) || 0,
    default_tax_rate: parseFloat(f.defaultTaxRate) || 0,
    payment_note: f.paymentNote.trim(),
    website: f.website.trim(),
    tagline: f.tagline.trim(),
  };
}

export default function ProfileScreen() {
  const {colors} = useThemedNavigation();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const {profile, loading, updateProfile, refreshProfile} = useProfile();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FormProfile>(EMPTY_FORM);
  const [display, setDisplay] = useState<FormProfile>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const form = domainToForm(profile);
    setDisplay(form);
    if (!editing) setDraft(form);
  }, [profile]);

  const handleEdit = () => {
    setDraft(domainToForm(profile));
    setError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft(display);
    setError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile(formToDomain(draft));
      await refreshProfile();
      setEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Could not save profile. Check column names in Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof FormProfile) => (value: string) => {
    setDraft((prev) => ({...prev, [field]: value}));
  };

  const view = editing ? draft : display;
  const initials = view.businessName
    ? view.businessName.slice(0, 2).toUpperCase()
    : view.ownerName
      ? view.ownerName
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : 'FB';

  if (loading && !profile) {
    return (
      <View className="flex-1 items-center justify-center" style={{backgroundColor: colors.background}}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{backgroundColor: colors.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-28"
        contentContainerStyle={{paddingTop: topPad + 16}}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-5 flex-row items-start justify-between px-5">
          <View className="flex-1 pr-3">
            <Text className="text-foreground text-[26px] font-extrabold tracking-[-0.5px]">
              Profile
            </Text>
            <Text className="text-muted-foreground mt-0.5 text-[13px]">
              Appears on PDFs and your public quote page
            </Text>
          </View>

          {!editing ? (
            <TouchableOpacity
              className="bg-secondary flex-row items-center gap-1.5 rounded-[10px] px-3.5 py-2"
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Feather name="edit-2" size={15} color={colors.primary} />
              <Text className="text-primary text-[14px] font-semibold">Edit</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="rounded-[10px] border px-3 py-2"
                style={{borderColor: colors.border}}
                onPress={handleCancel}
                disabled={saving}
              >
                <Text className="text-[14px] font-semibold text-foreground">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-primary rounded-[10px] px-4 py-2"
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-[14px] font-bold text-white">
                    {saved ? 'Saved!' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {error ? (
          <View className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        <View className="mx-4 mb-3.5 flex-row items-center gap-4 rounded-[20px] bg-secondary-foreground p-5">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Text className="text-[22px] font-extrabold text-white">{initials}</Text>
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-[18px] font-bold text-white">
              {displayBusinessName(
                profile ||
                  ({
                    business_name: view.businessName,
                    full_name: view.ownerName,
                  } as DomainProfile),
              )}
            </Text>
            {view.tagline ? (
              <Text className="text-[13px] text-slate-300">{view.tagline}</Text>
            ) : null}
            <Text className="text-[12px] text-slate-400">
              {displayLocation(
                profile ||
                  ({
                    address: view.address,
                    city: view.city,
                    state: view.state,
                    zip: view.zip,
                  } as DomainProfile),
              ) || 'Add your service area in Edit'}
            </Text>
          </View>
        </View>

        {!editing && (view.phone || view.email) ? (
          <View className="mb-3.5 flex-row gap-2.5 px-4">
            {view.phone ? (
              <TouchableOpacity
                className="bg-card flex-1 flex-row items-center justify-center gap-1.5 rounded-xl p-3"
                onPress={() => Linking.openURL(`tel:${view.phone}`)}
              >
                <Feather name="phone" size={16} color={colors.primary} />
                <Text className="text-[13px] font-semibold" style={{color: colors.primary}} numberOfLines={1}>
                  {view.phone}
                </Text>
              </TouchableOpacity>
            ) : null}
            {view.email ? (
              <TouchableOpacity
                className="bg-card flex-1 flex-row items-center justify-center gap-1.5 rounded-xl p-3"
                onPress={() => Linking.openURL(`mailto:${view.email}`)}
              >
                <Feather name="mail" size={16} color={colors.primary} />
                <Text className="text-[13px] font-semibold" style={{color: colors.primary}} numberOfLines={1}>
                  {view.email}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <SectionCard title="Business info" colors={colors}>
          {editing ? (
            <>
              <Field label="Business name" value={draft.businessName} onChange={update('businessName')} placeholder="Smith's Handyman Services" colors={colors} />
              <Field label="Owner name" value={draft.ownerName} onChange={update('ownerName')} placeholder="John Smith" colors={colors} />
              <Field label="Tagline" value={draft.tagline} onChange={update('tagline')} placeholder="Quality work, fair prices" colors={colors} />
              <Field label="Website" value={draft.website} onChange={update('website')} placeholder="www.example.com" colors={colors} />
            </>
          ) : (
            <>
              <InfoRow icon="briefcase" label="Business" value={view.businessName} colors={colors} />
              <InfoRow icon="user" label="Owner" value={view.ownerName} colors={colors} />
              {view.tagline ? <InfoRow icon="tag" label="Tagline" value={view.tagline} colors={colors} /> : null}
              {view.website ? <InfoRow icon="globe" label="Website" value={view.website} colors={colors} /> : null}
            </>
          )}
        </SectionCard>

        <SectionCard title="Contact" colors={colors}>
          {editing ? (
            <>
              <Field label="Phone" value={draft.phone} onChange={update('phone')} placeholder="(555) 555-5555" keyboardType="phone-pad" colors={colors} />
              <Field label="Email" value={draft.email} onChange={update('email')} placeholder="you@example.com" keyboardType="email-address" colors={colors} />
              <Field label="Street address" value={draft.address} onChange={update('address')} placeholder="123 Main St" colors={colors} />
              <View className="flex-row gap-2">
                <View className="flex-[2]">
                  <Field label="City" value={draft.city} onChange={update('city')} placeholder="Tampa" colors={colors} />
                </View>
                <View className="flex-1">
                  <Field label="State" value={draft.state} onChange={update('state')} placeholder="FL" colors={colors} />
                </View>
                <View className="flex-1">
                  <Field label="ZIP" value={draft.zip} onChange={update('zip')} placeholder="33601" keyboardType="number-pad" colors={colors} />
                </View>
              </View>
            </>
          ) : (
            <>
              <InfoRow icon="phone" label="Phone" value={view.phone} colors={colors} />
              <InfoRow icon="mail" label="Email" value={view.email} colors={colors} />
              {(view.address || view.city) ? (
                <InfoRow
                  icon="map-pin"
                  label="Address"
                  value={[view.address, view.city, view.state, view.zip].filter(Boolean).join(', ')}
                  colors={colors}
                />
              ) : null}
            </>
          )}
        </SectionCard>

        <SectionCard title="License & insurance" colors={colors}>
          {editing ? (
            <>
              <Field label="License number" value={draft.licenseNumber} onChange={update('licenseNumber')} placeholder="CGC-123456" colors={colors} />
              <Field label="Insurance / policy" value={draft.insuranceInfo} onChange={update('insuranceInfo')} placeholder="$1M liability" colors={colors} />
            </>
          ) : (
            <>
              <InfoRow icon="shield" label="License" value={view.licenseNumber || 'Not set'} colors={colors} />
              <InfoRow icon="check-circle" label="Insurance" value={view.insuranceInfo || 'Not set'} colors={colors} />
            </>
          )}
        </SectionCard>

        <SectionCard title="Job defaults" colors={colors}>
          {editing ? (
            <>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Field label="Labor $/hr" value={draft.defaultLaborRate} onChange={update('defaultLaborRate')} placeholder="85" keyboardType="decimal-pad" colors={colors} />
                </View>
                <View className="flex-1">
                  <Field label="Mat. markup %" value={draft.defaultMaterialMarkup} onChange={update('defaultMaterialMarkup')} placeholder="20" keyboardType="decimal-pad" colors={colors} />
                </View>
                <View className="flex-1">
                  <Field label="Tax %" value={draft.defaultTaxRate} onChange={update('defaultTaxRate')} placeholder="0" keyboardType="decimal-pad" colors={colors} />
                </View>
              </View>
              <Field label="Payment terms" value={draft.paymentNote} onChange={update('paymentNote')} multiline colors={colors} />
            </>
          ) : (
            <>
              <View className="mb-3 flex-row gap-2.5">
                <DefaultStat label="Labor" value={`$${view.defaultLaborRate}/hr`} colors={colors} />
                <DefaultStat label="Markup" value={`${view.defaultMaterialMarkup}%`} colors={colors} />
                <DefaultStat label="Tax" value={`${view.defaultTaxRate}%`} colors={colors} />
              </View>
              {view.paymentNote ? (
                <View className="bg-secondary flex-row items-start gap-2 rounded-[10px] p-2.5">
                  <Feather name="credit-card" size={14} color={colors.icon} />
                  <Text className="text-muted-foreground flex-1 text-[13px] leading-[18px]">
                    {view.paymentNote}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </SectionCard>

        {!editing && !view.businessName && !view.ownerName ? (
          <TouchableOpacity
            className="bg-secondary mx-4 mb-3.5 flex-row items-start gap-3 rounded-2xl border-2 border-dashed border-primary p-4"
            onPress={handleEdit}
          >
            <Feather name="user-plus" size={20} color={colors.primary} />
            <View className="flex-1 gap-1">
              <Text className="text-primary text-[16px] font-bold">Set up your profile</Text>
              <Text className="text-[13px] leading-[18px] text-muted-foreground">
                Business name, phone, and address show on every PDF and client quote link.
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function SectionCard({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View className="bg-card mx-4 mb-3.5 rounded-2xl p-4">
      <Text className="mb-3 text-[13px] font-bold uppercase tracking-[0.6px] text-foreground">
        {title}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  if (!value) return null;
  return (
    <View className="flex-row items-start gap-2.5 border-b py-2.5" style={{borderBottomColor: colors.border}}>
      <Feather name={icon} size={15} color={colors.icon} />
      <View className="flex-1 gap-0.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
          {label}
        </Text>
        <Text className="text-[15px] text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'decimal-pad' | 'number-pad';
  multiline?: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View className="mb-3">
      <Text className="text-muted-foreground mb-1.5 text-[11px] font-bold uppercase tracking-[0.5px]">
        {label}
      </Text>
      <TextInput
        className="text-foreground rounded-[10px] border px-3 py-2.5 text-[15px]"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
    </View>
  );
}

function DefaultStat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View className="flex-1 items-center gap-1 rounded-[10px] bg-background p-3">
      <Text className="text-[17px] font-extrabold tracking-[-0.3px] text-primary">{value}</Text>
      <Text className="text-[11px] font-medium text-muted-foreground">{label}</Text>
    </View>
  );
}
