import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {useAuth} from "@/context/auth-context";
import {router} from "expo-router";

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    const {user, session, signIn, signUp} = useAuth();

    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password);
                Alert.alert('Success', 'Check your email to confirm your account!');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && session) {
            router.replace('/(tabs)');
        }
    }, [session, user]);

    return (

        <View className="flex-1 justify-center px-6 bg-background">
            <View className="items-center mb-12">
                <Text className="text-4xl font-bold text-primary">FixBid</Text>
                <Text className="text-xl text-gray-600 mt-2">Handyman made simple</Text>
            </View>

            <Text className="text-2xl font-semibold mb-8">
                {isLogin ? 'Welcome back' : 'Create your account'}
            </Text>

            <TextInput
                className="bg-gray-100 border border-gray-300 rounded-xl px-4 py-4 mb-4 text-lg"
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                className="bg-gray-100 border border-gray-300 rounded-xl px-4 py-4 mb-6 text-lg"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                className="bg-blue-600 py-4 rounded-2xl active:bg-blue-700"
            >
                {loading ? (
                    <ActivityIndicator color="white"/>
                ) : (
                    <Text className="text-white text-center text-xl font-semibold">
                        {isLogin ? 'Sign In' : 'Sign Up'}
                    </Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setIsLogin(!isLogin)}
                className="mt-6"
            >
                <Text className="text-center text-blue-600 text-base">
                    {isLogin
                        ? "Don't have an account? Sign up"
                        : "Already have an account? Sign in"}
                </Text>
            </TouchableOpacity>
        </View>

    );
}
