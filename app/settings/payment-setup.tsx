import {Feather} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import React, {useState} from "react";
import {
    Alert,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import useThemeColor from "@/hooks/use-theme-color";
import {supabase} from "@/lib/supabase";
import * as WebBrowser from "expo-web-browser";
import {cn} from "@/lib/utils";

type Option = "debit" | "bank" | null;

export default function PaymentSetupScreen() {
    const {colors} = useThemedNavigation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [selected, setSelected] = useState<Option>(null);
    const [loading, setLoading] = useState(false);

    const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

    const handleConnectPress = async () => {
        if(!selected) return;

        setLoading(true);
        try {
            const {data, error} = await supabase.functions.invoke('create-stripe-onboarding');
            if (error) throw error;

            if (data?.url) {
                // Open the link in the SYSTEM browser
                await WebBrowser.openBrowserAsync(data.url);
            }
        } catch (err) {
            Alert.alert("Error", "Could not start onboarding. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1" style={{backgroundColor: colors.background}}>
            <ScrollView
                className="px-5"
                contentContainerStyle={{
                    paddingTop: topPad + 20,
                    paddingBottom: insets.bottom + 32,
                }}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                    className="mb-6 self-start"
                    onPress={() => router.back()}
                    hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
                >
                    <Feather name="arrow-left" size={20} color={colors.icon}/>
                </TouchableOpacity>

                <View className="mb-8 gap-3">
                    <Text
                        className="text-foreground text-center text-[26px] font-extrabold leading-8 tracking-[-0.5px]">
                        How do you want to get paid?
                    </Text>
                    <Text className="text-muted-foreground max-w-[320px] text-[15px] leading-[22px]">
                        Choose how your money arrives after a job is complete. You can always change this later.
                    </Text>
                </View>

                <Pressable
                    className="mb-3.5 bg-card rounded-[18px] p-[18px] gap-3"
                    style={({pressed}) => [
                        {
                            borderColor: selected === "debit" ? colors.primary : colors.border,
                            borderWidth: selected === "debit" ? 2 : 1.5,
                            opacity: pressed ? 0.88 : 1,
                        },
                    ]}
                    onPress={() => setSelected("debit")}
                >
                    <View
                        className="mb-[-4px] self-start flex-row items-center gap-1 rounded-md px-2 py-1"
                        style={{backgroundColor: colors.primary}}
                    >
                        <Feather name="star" size={10} color="#fff"/>
                        <Text className="text-[10px] font-extrabold tracking-[0.6px] text-white">
                            RECOMMENDED
                        </Text>
                    </View>

                    <View className="flex-row items-center gap-3">
                        <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
                              style={{backgroundColor: "#FFF3EB"}}>
                            <Feather name="credit-card" size={22} color={colors.primary}/>
                        </View>

                        <View className="flex-1 gap-1">
                            <Text className="text-foreground text-[18px] font-bold">
                                Debit Card
                            </Text>
                            <View className="self-start flex-row items-center gap-1 rounded-full px-2 py-0.5"
                                  style={{backgroundColor: "#DCFCE7"}}>
                                <Feather name="zap" size={11} color="#16A34A"/>
                                <Text className="text-[12px] font-bold" style={{color: "#16A34A"}}>
                                    Instant
                                </Text>
                            </View>
                        </View>

                        {selected === "debit" && (
                            <View className="h-7 w-7 shrink-0 items-center justify-center rounded-full"
                                  style={{backgroundColor: colors.primary}}>
                                <Feather name="check" size={14} color="#fff"/>
                            </View>
                        )}
                    </View>

                    <Text className="text-muted-foreground text-[14px] leading-[21px]">
                        Faster setup — money arrives in{" "}
                        <Text className="text-foreground font-semibold">
                            minutes
                        </Text>{" "}
                        after your client pays.
                    </Text>

                    <View className="gap-2 border-t pt-3" style={{borderTopColor: colors.border}}>
                        <CheckRow text="Have your debit card ready" colors={colors}/>
                        <CheckRow text="No bank account numbers needed" colors={colors}/>
                        <CheckRow text="Works with any major debit card" colors={colors}/>
                    </View>
                </Pressable>

                <Pressable
                    className="bg-card mb-3.5 rounded-[18px] p-[18px] gap-3"
                    style={({pressed}) => [
                        {
                            borderColor: selected === "bank" ? colors.primary : colors.border,
                            borderWidth: selected === "bank" ? 2 : 1.5,
                            opacity: pressed ? 0.88 : 1,
                        },
                    ]}
                    onPress={() => setSelected("bank")}
                >
                    <View className="flex-row items-center gap-3">
                        <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
                              style={{backgroundColor: "#EFF6FF"}}>
                            <Feather name="home" size={22} color="#3B82F6"/>
                        </View>

                        <View className="flex-1 gap-1">
                            <Text className="text-foreground text-[18px] font-bold">
                                Bank Account
                            </Text>
                            <View className="self-start flex-row items-center gap-1 rounded-full px-2 py-0.5"
                                  style={{backgroundColor: "#FEF9C3"}}>
                                <Feather name="clock" size={11} color="#B45309"/>
                                <Text className="text-[12px] font-bold" style={{color: "#B45309"}}>
                                    2–3 days
                                </Text>
                            </View>
                        </View>

                        {selected === "bank" && (
                            <View className="h-7 w-7 shrink-0 items-center justify-center rounded-full"
                                  style={{backgroundColor: colors.primary}}>
                                <Feather name="check" size={14} color="#fff"/>
                            </View>
                        )}
                    </View>

                    <Text className="text-muted-foreground text-[14px] leading-[21px]">
                        Standard bank transfer — money arrives in{" "}
                        <Text className="text-foreground font-semibold">
                            2–3 business days
                        </Text>{" "}
                        after your client pays.
                    </Text>

                    <View className="gap-2 border-t pt-3" style={{borderTopColor: colors.border}}>
                        <CheckRow text="Have your routing number ready" colors={colors}/>
                        <CheckRow text="Have your account number ready" colors={colors}/>
                        <CheckRow text="Typically found on a paper check" colors={colors}/>
                    </View>
                </Pressable>

                {selected === "bank" && (
                    <View className="bg-secondary mb-2 flex-row items-start gap-2.5 rounded-xl p-3.5">
                        <Feather name="info" size={15} color={colors.icon}/>
                        <Text className="flex-1 text-[13px] leading-[19px] text-muted-foreground">
                            Your routing and account numbers are printed at the bottom of any personal check, or inside
                            your banking app under &#34;Account details.&#34;
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    className={cn("mt-2 mb-4 items-center justify-center rounded-[14px] py-4",
                        selected ? "bg-primary" : "bg-secondary"
                    )}
                    onPress={handleConnectPress}
                    disabled={!selected}
                    activeOpacity={0.85}
                >
                    <Text className="text-[16px] font-bold" style={{color: selected ? "#fff" : colors.highlight}}>
                        {selected ? "Continue to Secure Setup →" : "Select an option above"}
                    </Text>
                </TouchableOpacity>

                <Text className="text-center text-[12px] leading-[18px] text-muted-foreground">
                    Payments are processed securely by Stripe. HandyPro never stores your card or bank details.
                </Text>
            </ScrollView>
        </View>
    );
}

function CheckRow({
                      text,
                      colors,
                  }: {
    text: string;
    colors: ReturnType<typeof useThemeColor>;
}) {
    return (
        <View className="flex-row items-center gap-2">
            <Feather name="check-circle" size={14} color={colors.state}/>
            <Text className="text-foreground text-[13px]">
                {text}
            </Text>
        </View>
    );
}
