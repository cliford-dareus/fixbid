import {useRouter, useSegments} from "expo-router";
import {useEffect} from "react";
import {useAuth} from "@/context/auth-context";

export default function Index() {
    const router = useRouter();
    const segments = useSegments();
    const {user, loading} = useAuth();

    useEffect(() => {
        if (loading || !segments) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            router.replace('/(auth)/sign-in');
        } else if (user && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [user, loading, segments, router]);

    return null;
};
