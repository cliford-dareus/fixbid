import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Clock, DollarSign } from 'lucide-react-native';
import {useAuth} from "@/context/auth-context";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();

  return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-blue-600 pt-12 pb-6 px-6">
          <Text className="text-white text-3xl font-bold">Good morning, Handyman {user?.email}!</Text>
          <Text className="text-blue-100 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <ScrollView className="flex-1 px-6 pt-6">
          {/* Quick Stats */}
          <View className="flex-row gap-4 mb-8">
            <View className="flex-1 bg-white p-5 rounded-3xl shadow-sm">
              <Clock size={28} color="#3b82f6" />
              <Text className="text-3xl font-bold mt-3">12</Text>
              <Text className="text-gray-500">Jobs this month</Text>
            </View>
            <View className="flex-1 bg-white p-5 rounded-3xl shadow-sm">
              <DollarSign size={28} color="#10b981" />
              <Text className="text-3xl font-bold mt-3">$2,840</Text>
              <Text className="text-gray-500">Earned</Text>
            </View>
          </View>

          {/* Big New Quote Button */}
          <TouchableOpacity
              onPress={() => router.push('/(tabs)/quotes/new')}
              className="bg-blue-600 py-6 rounded-3xl flex-row items-center justify-center gap-3 active:bg-blue-700 mb-8"
          >
            <Plus size={32} color="white" />
            <Text className="text-white text-2xl font-semibold">New Quote</Text>
          </TouchableOpacity>

          {/* Recent Activity */}
          <Text className="text-xl font-semibold mb-4">Recent Quotes</Text>

          <View className="bg-white rounded-3xl p-5 mb-4">
            <Text className="font-medium">Faucet Replacement - Mrs. Johnson</Text>
            <Text className="text-green-600 mt-1">$185 • Approved</Text>
            <Text className="text-gray-400 text-sm mt-3">Today at 10:30 AM</Text>
          </View>

          <View className="bg-white rounded-3xl p-5">
            <Text className="font-medium">Toilet Repair - Mr. Ramirez</Text>
            <Text className="text-amber-600 mt-1">$95 • Sent</Text>
            <Text className="text-gray-400 text-sm mt-3">Yesterday</Text>
          </View>
        </ScrollView>
      </View>
  );
}
