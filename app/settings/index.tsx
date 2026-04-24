import {Alert, KeyboardAvoidingView, Linking, Platform, Text, TouchableOpacity, View} from "react-native";
import {router} from "expo-router";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import React, {useEffect} from "react";
import {SectionCard} from "@/app/settings/profile";
import {Feather} from "@expo/vector-icons";
import {useProfile} from "@/context/profile-context";
import {supabase} from "@/lib/supabase";
import {useAuth} from "@/context/auth-context";
import * as WebBrowser from 'expo-web-browser';

export default function SettingsModal() {
    const {user} = useAuth();
    const {colors} = useThemedNavigation();
    const insets = useSafeAreaInsets();
    const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

    const [stripeAccountId, setStripeAccountId] = React.useState<string | null>(null);
    const [status, setStatus] = React.useState<string>('loading');
    const [loading, setLoading] = React.useState(true);

    const {profile} = useProfile();

    useEffect(() => {
        fetchAccountStatus();

        // Listen for the app returning from the browser
        const subscription = Linking.addEventListener('url', (event) => {
            if (event.url.includes('onboarding-complete')) {
                // Close the browser if using Expo
                WebBrowser.dismissBrowser();
                fetchAccountStatus();
            }
        });

        return () => subscription.remove();
    }, [])

    const fetchAccountStatus = async () => {
        const {data} = await supabase
            .from('profiles')
            .select('stripe_account_id, stripe_status')
            .eq('id', user?.id)
            .single();

        if (data) {
            setStripeAccountId(data.stripe_account_id);
            setStatus(data.stripe_status || 'not_connected');
        }
    };

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
                            <View className="w-12 h-12 rounded-full bg-primary"/>

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
                    <View className="flex-row items-center justify-between gap-4 mt-2"></View>
                </SectionCard>

                <SectionCard title="Payments" colors={colors}>
                    {/*<View style={{padding: 20}}>*/}
                    {/*    <Text>Bank Account Status: {status}</Text>*/}
                    {/*    {status === 'not_connected' && (*/}
                    {/*        <TouchableOpacity className="text-foreground" onPress={handleConnectPress}>*/}
                    {/*            <Text className="text-foreground">Connect Bank Account</Text>*/}
                    {/*        </TouchableOpacity>*/}
                    {/*    )}*/}
                    {/*    {status === 'connected' && <Text className="text-foreground">✅ Bank account linked</Text>}*/}
                    {/*    {status === 'pending' && <Text className="text-foreground">⏳ Awaiting verification</Text>}*/}
                    {/*</View>*/}

                    <TouchableOpacity
                        className="bg-background flex-row items-center justify-between gap-3 rounded-xl p-3"
                        onPress={() => router.push("/settings/payment-setup")}
                        activeOpacity={0.8}
                    >
                        <View className="bg-[#FFF3EB] w-10 h-10 rounded-xl shrink-0 items-center justify-center">
                            <Feather name="dollar-sign" size={18} color={colors.primary} />
                        </View>
                        <View className="flex-1 gap-[2px]">
                            <Text className="text-foreground text-[15px] font-semibold">
                                Set Up Payouts
                            </Text>
                            <Text className="text-muted-foreground text-xs">
                                Choose how you get paid — debit card or bank account
                            </Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={colors.icon} />
                    </TouchableOpacity>
                </SectionCard>

                <SectionCard title="Appearance" colors={colors}>
                    <View>
                        <View>
                            <View className="flex-row justify-around mt-2">
                                <TouchableOpacity
                                    className="py-2 px-4 bg-primary rounded"
                                    onPress={() => console.log('Light Theme Selected')}
                                >
                                    <Text className="text-white text-center">Light</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="py-2 px-4 bg-primary rounded"
                                    onPress={() => console.log('Dark Theme Selected')}
                                >
                                    <Text className="text-white text-center">Dark</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="py-2 px-4 bg-primary rounded"
                                    onPress={() => console.log('System Theme Selected')}
                                >
                                    <Text className="text-white text-center">System</Text>
                                </TouchableOpacity>
                            </View>
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
            </View>
        </KeyboardAvoidingView>
    )
}