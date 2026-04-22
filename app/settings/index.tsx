import {KeyboardAvoidingView, Platform, Text, TouchableOpacity, View} from "react-native";
import {Link, router} from "expo-router";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import React from "react";
import {SectionCard} from "@/app/settings/profile";
import {Feather} from "@expo/vector-icons";

export default function SettingsModal() {
    const {colors} = useThemedNavigation();
    const insets = useSafeAreaInsets();
    const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

    return (
        <KeyboardAvoidingView
            className="flex-1"
            style={{backgroundColor: colors.background}}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View className="bg-background" style={{paddingTop: topPad + 16}}>
                <View className="px-5">
                    <Text
                        className="text-foreground text-[26px] font-extrabold tracking-[-0.5px] uppercase">SETTINGS</Text>
                    <Text className="text-muted-foreground mt-0.5 text-[13px]">
                        Your business info & defaults
                    </Text>
                </View>

                <View className="mt-4">

                </View>

                <SectionCard title="Account" colors={colors}>
                    <TouchableOpacity
                        onPress={() => router.push('/settings/profile')}
                        className="w-full flex-row items-center justify-between gap-4 mt-2"
                    >
                        <View className="flex-row items-center justify-between gap-4">
                            <View className="w-10 h-10 rounded-full bg-primary"/>

                            <View className="">
                                <Text className="text-foreground text-[16px] font-semibold">Handyman</Text>
                                <Text className="text-muted-foreground text-[13px]">
                                    Update your profile info
                                </Text>
                            </View>
                        </View>

                        <Feather name="chevron-right" size={20} color={colors.icon}/>
                    </TouchableOpacity>
                </SectionCard>

                <SectionCard title="Subscription" colors={colors}>
                    <View className="flex-row items-center justify-between gap-4 mt-2">
                        <View className="flex-row items-center justify-between gap-4">
                            <View className="w-10 h-10 rounded-full bg-primary"/>
                        </View>
                    </View>
                </SectionCard>

                <SectionCard title="Billing" colors={colors}>
                    <View className="flex-row items-center justify-between gap-4 mt-2">
                        <View className="flex-row items-center justify-between gap-4">
                            <View className="w-10 h-10 rounded-full bg-primary"/>
                        </View>
                    </View>
                </SectionCard>

                <SectionCard title="Notifications" colors={colors}>
                    <View className="flex-row items-center justify-between gap-4 mt-2">
                        <View className="flex-row items-center justify-between gap-4">
                            <View className="w-10 h-10 rounded-full bg-primary"/>
                        </View>
                    </View>

                </SectionCard>

                <SectionCard title="Appearance" colors={colors}>
                    <View>

                    </View>
                </SectionCard>

                <View className=""></View>
            </View>
        </KeyboardAvoidingView>
    )
}