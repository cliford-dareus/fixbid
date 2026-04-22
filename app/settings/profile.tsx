import {Feather} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, {useEffect, useState} from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import useThemeColors from "@/hooks/use-theme-color";

const PROFILE_KEY = "handypro_profile_v1";

interface Profile {
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

const DEFAULT_PROFILE: Profile = {
    businessName: "",
    ownerName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    licenseNumber: "",
    insuranceInfo: "",
    defaultLaborRate: "85",
    defaultMaterialMarkup: "20",
    defaultTaxRate: "0",
    paymentNote: "Payment due upon job completion. Venmo, Zelle, cash, or check accepted.",
    website: "",
    tagline: "",
};

export default function ProfileScreen() {
    const {colors} = useThemedNavigation();
    const insets = useSafeAreaInsets();
    const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

    const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<Profile>(DEFAULT_PROFILE);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(PROFILE_KEY).then((raw) => {
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    setProfile({...DEFAULT_PROFILE, ...parsed});
                    setDraft({...DEFAULT_PROFILE, ...parsed});
                } catch {
                }
            }
        });
    }, []);

    const handleEdit = () => {
        setDraft({...profile});
        setEditing(true);
    };

    const handleCancel = () => {
        setDraft({...profile});
        setEditing(false);
    };

    const handleSave = async () => {
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(draft));
        setProfile({...draft});
        setEditing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const update = (field: keyof Profile) => (value: string) => {
        setDraft((prev) => ({...prev, [field]: value}));
    };

    const initials = profile.businessName
        ? profile.businessName.slice(0, 2).toUpperCase()
        : profile.ownerName
            ? profile.ownerName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "HP";

    return (
        <KeyboardAvoidingView
            className="flex-1"
            style={{backgroundColor: colors.background}}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-28"
                contentContainerStyle={{paddingTop: topPad + 16}}
                keyboardShouldPersistTaps="handled"
            >
                <View className="mb-5 flex-row items-start justify-between px-5">
                    <View>
                        <Text className="text-foreground text-[26px] font-extrabold tracking-[-0.5px] uppercase">
                            Profile
                        </Text>
                        <Text className="text-muted-foreground mt-0.5 text-[13px]">
                            Your business info & defaults
                        </Text>
                    </View>

                    {!editing ? (
                        <TouchableOpacity
                            className="bg-secondary flex-row items-center gap-1.5 rounded-[10px] px-3.5 py-2"
                            onPress={handleEdit}
                            activeOpacity={0.8}
                        >
                            <Feather name="edit-2" size={15} color={colors.primary}/>
                            <Text className="text-primary ext-[14px] font-semibold">
                                Edit
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                className="rounded-[10px] border px-3 py-2"
                                style={{borderColor: colors.border}}
                                onPress={handleCancel}
                                activeOpacity={0.8}
                            >
                                <Text className="text-[14px] font-semibold text-foreground ">
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="bg-primary rounded-[10px] px-4 py-2"
                                onPress={handleSave}
                                activeOpacity={0.85}
                            >
                                <Text className="text-[14px] font-bold text-white">
                                    {saved ? "Saved!" : "Save"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View className="text-secondary-foreground mx-4 mb-3.5 flex-row items-center gap-4 rounded-[20px] p-5">
                    <View className="bg-primary h-16 w-16 items-center justify-center rounded-full">
                        <Text className="text-[22px] font-extrabold text-white">{initials}</Text>
                    </View>

                    <View className="flex-1 gap-1">
                        <Text className="text-[18px] font-bold text-foreground">
                            {profile.businessName || profile.ownerName || "Your Business"}
                        </Text>
                        {profile.tagline ? (
                            <Text className="text-[13px] text-muted-foreground">{profile.tagline}</Text>
                        ) : null}

                        <View className="mt-1 flex-row flex-wrap gap-3">
                            {profile.licenseNumber ? (
                                <View className="flex-row items-center gap-1">
                                    <Feather name="shield" size={12} color="#94A3B8"/>
                                    <Text className="text-[12px] text-slate-400">Lic #{profile.licenseNumber}</Text>
                                </View>
                            ) : null}

                            {profile.city && profile.state ? (
                                <View className="flex-row items-center gap-1">
                                    <Feather name="map-pin" size={12} color="#94A3B8"/>
                                    <Text className="text-[12px] text-slate-400">
                                        {profile.city}, {profile.state}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </View>

                {!editing && (profile.phone || profile.email) && (
                    <View className="mb-3.5 flex-row gap-2.5 px-4">
                        {profile.phone ? (
                            <TouchableOpacity
                                className="bg-card flex-1 flex-row items-center justify-center gap-1.5 rounded-xl p-3"
                                onPress={() => Linking.openURL(`tel:${profile.phone}`)}
                                activeOpacity={0.8}
                            >
                                <Feather name="phone" size={16} color={colors.primary}/>
                                <Text className="text-[13px] font-semibold" style={{color: colors.primary}}
                                      numberOfLines={1}>
                                    {profile.phone}
                                </Text>
                            </TouchableOpacity>
                        ) : null}

                        {profile.email ? (
                            <TouchableOpacity
                                className="bg-card flex-1 flex-row items-center justify-center gap-1.5 rounded-xl p-3"
                                onPress={() => Linking.openURL(`mailto:${profile.email}`)}
                                activeOpacity={0.8}
                            >
                                <Feather name="mail" size={16} color={colors.primary}/>
                                <Text className="text-[13px] font-semibold" style={{color: colors.primary}}
                                      numberOfLines={1}>
                                    {profile.email}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                )}

                <SectionCard title="Business Info" colors={colors}>
                    {editing ? (
                        <>
                            <Field label="Business Name" value={draft.businessName} onChange={update("businessName")}
                                   placeholder="Smith's Handyman Services" colors={colors}/>
                            <Field label="Owner Name" value={draft.ownerName} onChange={update("ownerName")}
                                   placeholder="John Smith" colors={colors}/>
                            <Field label="Tagline" value={draft.tagline} onChange={update("tagline")}
                                   placeholder="Quality work, fair prices" colors={colors}/>
                            <Field label="Website" value={draft.website} onChange={update("website")}
                                   placeholder="www.smithshandyman.com" colors={colors}/>
                        </>
                    ) : (
                        <>
                            <InfoRow icon="briefcase" label="Business" value={profile.businessName} colors={colors}/>
                            <InfoRow icon="user" label="Owner" value={profile.ownerName} colors={colors}/>
                            {profile.tagline ?
                                <InfoRow icon="tag" label="Tagline" value={profile.tagline} colors={colors}/> : null}
                            {profile.website ?
                                <InfoRow icon="globe" label="Website" value={profile.website} colors={colors}/> : null}
                        </>
                    )}
                </SectionCard>

                <SectionCard title="Contact" colors={colors}>
                    {editing ? (
                        <>
                            <Field label="Phone" value={draft.phone} onChange={update("phone")}
                                   placeholder="(555) 555-5555" keyboardType="phone-pad" colors={colors}/>
                            <Field label="Email" value={draft.email} onChange={update("email")}
                                   placeholder="john@example.com" keyboardType="email-address" colors={colors}/>
                            <Field label="Street Address" value={draft.address} onChange={update("address")}
                                   placeholder="123 Main St" colors={colors}/>
                            <View className="flex-row gap-2">
                                <View className="flex-[2]">
                                    <Field label="City" value={draft.city} onChange={update("city")} placeholder="Tampa"
                                           colors={colors}/>
                                </View>
                                <View className="flex-1">
                                    <Field label="State" value={draft.state} onChange={update("state")} placeholder="FL"
                                           colors={colors}/>
                                </View>
                                <View className="flex-1">
                                    <Field label="ZIP" value={draft.zip} onChange={update("zip")} placeholder="33601"
                                           keyboardType="number-pad" colors={colors}/>
                                </View>
                            </View>
                        </>
                    ) : (
                        <>
                            <InfoRow icon="phone" label="Phone" value={profile.phone} colors={colors}/>
                            <InfoRow icon="mail" label="Email" value={profile.email} colors={colors}/>
                            {profile.address ? (
                                <InfoRow
                                    icon="map-pin"
                                    label="Address"
                                    value={[profile.address, profile.city, profile.state, profile.zip].filter(Boolean).join(", ")}
                                    colors={colors}
                                />
                            ) : null}
                        </>
                    )}
                </SectionCard>

                <SectionCard title="License & Insurance" colors={colors}>
                    {editing ? (
                        <>
                            <Field label="License Number" value={draft.licenseNumber} onChange={update("licenseNumber")}
                                   placeholder="CGC-123456" colors={colors}/>
                            <Field label="Insurance / Policy Info" value={draft.insuranceInfo}
                                   onChange={update("insuranceInfo")} placeholder="State Farm #ABC-123, $1M liability"
                                   colors={colors}/>
                        </>
                    ) : (
                        <>
                            <InfoRow icon="shield" label="License" value={profile.licenseNumber || "Not set"}
                                     colors={colors}/>
                            <InfoRow icon="check-circle" label="Insurance" value={profile.insuranceInfo || "Not set"}
                                     colors={colors}/>
                        </>
                    )}
                </SectionCard>

                <SectionCard title="Job Defaults" colors={colors}>
                    {editing ? (
                        <>
                            <View className="flex-row gap-2">
                                <View className="flex-1">
                                    <Field label="Labor Rate ($/hr)" value={draft.defaultLaborRate}
                                           onChange={update("defaultLaborRate")} placeholder="85"
                                           keyboardType="decimal-pad" colors={colors}/>
                                </View>
                                <View className="flex-1">
                                    <Field label="Material Markup %" value={draft.defaultMaterialMarkup}
                                           onChange={update("defaultMaterialMarkup")} placeholder="20"
                                           keyboardType="decimal-pad" colors={colors}/>
                                </View>
                                <View className="flex-1">
                                    <Field label="Tax Rate %" value={draft.defaultTaxRate}
                                           onChange={update("defaultTaxRate")} placeholder="0"
                                           keyboardType="decimal-pad" colors={colors}/>
                                </View>
                            </View>
                            <Field label="Payment Terms / Note" value={draft.paymentNote}
                                   onChange={update("paymentNote")} placeholder="Payment due upon completion..."
                                   multiline colors={colors}/>
                        </>
                    ) : (
                        <>
                            <View className="mb-3 flex-row gap-2.5">
                                <DefaultStat label="Labor Rate" value={`$${profile.defaultLaborRate}/hr`}
                                             colors={colors}/>
                                <DefaultStat label="Mat. Markup" value={`${profile.defaultMaterialMarkup}%`}
                                             colors={colors}/>
                                <DefaultStat label="Tax Rate" value={`${profile.defaultTaxRate}%`} colors={colors}/>
                            </View>
                            {profile.paymentNote ? (
                                <View className="bg-secondary flex-row items-start gap-2 rounded-[10px] p-2.5">
                                    <Feather name="credit-card" size={14} color={colors.icon}/>
                                    <Text className="text-muted-foreground flex-1 text-[13px] leading-[18px]">
                                        {profile.paymentNote}
                                    </Text>
                                </View>
                            ) : null}
                        </>
                    )}
                </SectionCard>

                {!editing && !profile.businessName && !profile.ownerName && (
                    <TouchableOpacity
                        className="bg-secondary mx-4 mb-3.5 flex-row items-start gap-3 rounded-2xl border-2 border-dashed border-primary p-4"
                        onPress={handleEdit}
                        activeOpacity={0.8}
                    >
                        <Feather name="user-plus" size={20} color={colors.primary}/>
                        <View className="flex-1 gap-1">
                            <Text className="text-primary text-[16px] font-bold">
                                Set up your profile
                            </Text>
                            <Text className="text-[13px] leading-[18px] text-muted-foreground">
                                Add your business name, license, and default rates so they appear on every quote.
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
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
            <Feather name={icon} size={15} color={colors.icon}/>
            <View className="flex-1 gap-0.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
                    {label}
                </Text>
                <Text className="text-[15px] text-foreground">
                    {value}
                </Text>
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
    keyboardType?: "default" | "phone-pad" | "email-address" | "decimal-pad" | "number-pad";
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
                    textAlignVertical: multiline ? "top" : "center",
                }}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                // placeholderTextColor={colors.mutedForeground}
                keyboardType={keyboardType ?? "default"}
                multiline={multiline}
                numberOfLines={multiline ? 3 : 1}
                autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
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
        <View className="flex-1 items-center gap-1 rounded-[10px] p-3 bg-background">
            <Text className="text-[17px] font-extrabold tracking-[-0.3px] text-primary">
                {value}
            </Text>
            <Text className="text-[11px] font-medium text-muted-foreground">
                {label}
            </Text>
        </View>
    );
}
