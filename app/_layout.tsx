import "./global.css";
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    useFonts,
} from "@expo-google-fonts/inter";
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {Stack, SplashScreen} from 'expo-router';
import {useEffect} from 'react';
import {AuthProvider, useAuth} from "@/context/auth-context";
import {QuoteProvider} from "@/context/quote-context";
import {StripeProvider} from '@stripe/stripe-react-native';
import {ProfileProvider} from "@/context/profile-context";
// eslint-disable-next-line import/no-named-as-default
import ThemeProvider from "@/context/theme-context";
import {registerPushTokenForUser, setupNotifications} from "@/lib/notification";

SplashScreen.preventAutoHideAsync();

function PushTokenRegistrar() {
    const {user} = useAuth();

    useEffect(() => {
        if (!user?.id) return;
        registerPushTokenForUser(user.id).catch((e) =>
            console.warn('push registration', e),
        );
    }, [user?.id]);

    return null;
}

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

    // Channels + permission prompt early (token saved after login)
    useEffect(() => {
        setupNotifications().catch(() => {});
    }, []);

    if (!fontsLoaded && !fontError) return null;

    return (
        <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
            <SafeAreaProvider>
                <GestureHandlerRootView style={{flex: 1}}>
                    <AuthProvider>
                        <ProfileProvider>
                            <QuoteProvider>
                                <ThemeProvider>
                                    <PushTokenRegistrar />
                                    <Stack screenOptions={{headerShown: false}}>
                                        <Stack.Screen name="index" options={{headerShown: false}}/>
                                        <Stack.Screen name="(auth)" options={{headerShown: false}}/>
                                        <Stack.Screen name="(tabs)" options={{headerShown: false}}/>

                                        <Stack.Screen name="quotes/new" options={{headerShown: false, presentation: 'modal'}}/>
                                        <Stack.Screen name="quotes/[id]" options={{headerShown: false}}/>
                                        <Stack.Screen name="settings" options={{headerShown: false, presentation: 'modal'}}/>
                                    </Stack>
                                </ThemeProvider>
                            </QuoteProvider>
                        </ProfileProvider>
                    </AuthProvider>
                </GestureHandlerRootView>
            </SafeAreaProvider>
        </StripeProvider>
    );
}
