import "./global.css";
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    useFonts,
} from "@expo-google-fonts/inter";
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {KeyboardProvider} from "react-native-keyboard-controller";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {Stack, SplashScreen} from 'expo-router';
import {useEffect} from 'react';
import {AuthProvider} from "@/context/auth-context";
import {QuoteProvider} from "@/context/quote-context";
import {StripeProvider} from '@stripe/stripe-react-native';
import {ProfileProvider} from "@/context/profile-context";
// eslint-disable-next-line import/no-named-as-default
import ThemeProvider from "@/context/theme-context";
import {setupNotifications} from "@/lib/notification";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    useEffect(() => {
        if (fontsLoaded || fontError) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    useEffect(() => {
        const setNotification = async () => {
            return await  setupNotifications();
        }
        setNotification().then(r => console.log("PUSH NOTIFICATION TOKEN", r));
    }, []);

    if (!fontsLoaded && !fontError) return null;

    return (
        <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
            <SafeAreaProvider>
                <GestureHandlerRootView style={{flex: 1}}>
                    {/*<KeyboardProvider>*/}
                    <AuthProvider>
                        <ProfileProvider>
                            <QuoteProvider>
                                <ThemeProvider>
                                    <Stack screenOptions={{headerShown: false}}>
                                        <Stack.Screen name="index" options={{headerShown: false}}/>
                                        <Stack.Screen name="(auth)" options={{headerShown: false}}/>
                                        <Stack.Screen name="(tabs)" options={{headerShown: false}}/>

                                        <Stack.Screen name="quotes/new" options={{headerShown: false, presentation: 'modal'}}/>
                                        <Stack.Screen name="quotes/[id]" options={{headerShown: false}}/>
                                        <Stack.Screen name="settings" options={{headerShown: false, presentation: 'modal'}}/>
                                        {/*<Stack.Screen name="settings/profile" options={{headerShown: false, presentation: 'modal', animation: 'slide_from_right'}}/>*/}
                                    </Stack>
                                </ThemeProvider>
                            </QuoteProvider>
                        </ProfileProvider>
                    </AuthProvider>
                    {/*</KeyboardProvider>*/}
                </GestureHandlerRootView>
            </SafeAreaProvider>
        </StripeProvider>
    );
}