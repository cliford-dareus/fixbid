import "./global.css";

import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useRootNavigationState, Stack} from 'expo-router';
import {useEffect, useState} from 'react';
import {AuthProvider} from "@/context/auth-context";
import {QuoteProvider} from "@/context/quote-context";
import {StripeProvider} from '@stripe/stripe-react-native';

export default function RootLayout() {
    const [isReady, setIsReady] = useState(false);
    const rootNavigationState = useRootNavigationState();

    // Wait until the root navigator is mounted
    useEffect(() => {
        if (rootNavigationState?.key) {
            setIsReady(true);
        }
    }, [rootNavigationState?.key]);

    // Show nothing (or a splash) until navigation is ready
    if (!isReady) {
        return null;   // Or <View className="flex-1 bg-white" /> if you want a blank screen
    }

    return (
        <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
            <SafeAreaProvider>
                <AuthProvider>
                    <QuoteProvider>
                        <Stack screenOptions={{headerShown: false}}>
                            <Stack.Screen name="index" options={{headerShown: false}}/>
                            <Stack.Screen name="(auth)" options={{headerShown: false}}/>
                            <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                        </Stack>
                    </QuoteProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </StripeProvider>
    );
}