import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {supabase} from "@/lib/supabase";
import {useAuth} from "@/context/auth-context";

interface Profile {
    full_name: string;
    business_name: string;
    phone: string;
    address: string;
    hourly_rate: number;
    logo_url?: string;
}

export default function ProfileScreen() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile>({
        full_name: '',
        business_name: '',
        phone: '',
        address: '',
        hourly_rate: 85,
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) loadProfile();
    }, [user]);

    const loadProfile = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            setProfile(data);
        }
        setLoading(false);
    };

    const saveProfile = async () => {
        if (!user) return;
        setSaving(true);

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                ...profile,
                updated_at: new Date().toISOString(),
            });

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert('Success', 'Profile saved successfully!');
        }
        setSaving(false);
    };

    const pickLogo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            // TODO: Upload to Supabase Storage and save URL
            Alert.alert('Coming soon', 'Logo upload will be added in next step');
        }
    };

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="bg-blue-600 pt-12 pb-8 px-6">
                <Text className="text-white text-3xl font-bold">My Profile</Text>
                <Text className="text-blue-100 mt-2">This info appears on all quotes and client views</Text>
            </View>

            <View className="px-6 pt-8 space-y-6">
                {/* Logo */}
                <View className="items-center">
                    <TouchableOpacity
                        onPress={pickLogo}
                        className="w-28 h-28 bg-gray-200 rounded-full items-center justify-center overflow-hidden"
                    >
                        {profile.logo_url ? (
                            <Image source={{ uri: profile.logo_url }} className="w-full h-full" />
                        ) : (
                            <Text className="text-gray-500">Add Logo</Text>
                        )}
                    </TouchableOpacity>
                    <Text className="text-sm text-gray-500 mt-2">Tap to change logo</Text>
                </View>

                {/* Business Name */}
                <View>
                    <Text className="text-gray-600 mb-2 font-medium">Business Name</Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-2xl px-5 py-4 text-lg"
                        value={profile.business_name}
                        onChangeText={(text) => setProfile({ ...profile, business_name: text })}
                        placeholder="Cliford Dareus Handyman Services"
                    />
                </View>

                {/* Full Name */}
                <View>
                    <Text className="text-gray-600 mb-2 font-medium">Your Full Name</Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-2xl px-5 py-4 text-lg"
                        value={profile.full_name}
                        onChangeText={(text) => setProfile({ ...profile, full_name: text })}
                        placeholder="Cliford Dareus"
                    />
                </View>

                {/* Phone */}
                <View>
                    <Text className="text-gray-600 mb-2 font-medium">Business Phone</Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-2xl px-5 py-4 text-lg"
                        value={profile.phone}
                        onChangeText={(text) => setProfile({ ...profile, phone: text })}
                        placeholder="(954) 555-1234"
                        keyboardType="phone-pad"
                    />
                </View>

                {/* Address */}
                <View>
                    <Text className="text-gray-600 mb-2 font-medium">Service Area / Address</Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-2xl px-5 py-4 text-lg h-24"
                        value={profile.address}
                        onChangeText={(text) => setProfile({ ...profile, address: text })}
                        placeholder="Miramar / Plantation / South Florida"
                        multiline
                    />
                </View>

                {/* Hourly Rate */}
                <View>
                    <Text className="text-gray-600 mb-2 font-medium">Default Hourly Rate ($)</Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-2xl px-5 py-4 text-lg"
                        value={profile.hourly_rate.toString()}
                        onChangeText={(text) => setProfile({ ...profile, hourly_rate: parseFloat(text) || 85 })}
                        keyboardType="numeric"
                    />
                </View>
            </View>

            <View className="px-6 py-10">
                <TouchableOpacity
                    onPress={saveProfile}
                    disabled={saving}
                    className="bg-blue-600 py-5 rounded-3xl"
                >
                    <Text className="text-white text-center text-xl font-semibold">
                        {saving ? 'Saving...' : 'Save Profile'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}