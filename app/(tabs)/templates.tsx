import React, { useState } from 'react';
import {View, Text, TouchableOpacity, ScrollView, TextInput, Alert} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import {useQuote} from "@/context/quote-context";

const initialTemplates = [
    {
        id: '1',
        name: 'Replace Faucet Cartridge',
        category: 'Plumbing',
        description: 'Single handle cartridge replacement',
        avgTimeMinutes: 45,
        baseLaborPrice: 85,
        materialCost: 25,
    },
    {
        id: '2',
        name: 'Toilet Repair - Running',
        category: 'Plumbing',
        description: 'Fix running toilet (flapper or fill valve)',
        avgTimeMinutes: 30,
        baseLaborPrice: 75,
        materialCost: 15,
    },
    {
        id: '3',
        name: 'Drywall Patch (Small)',
        category: 'Drywall',
        description: '12x12 inch hole repair and paint',
        avgTimeMinutes: 60,
        baseLaborPrice: 95,
        materialCost: 20,
    },
    {
        id: '4',
        name: 'Install Floating Shelf',
        category: 'Carpentry',
        description: 'Single 24" shelf with brackets',
        avgTimeMinutes: 40,
        baseLaborPrice: 65,
        materialCost: 30,
    },
    {
        id: '5',
        name: 'Garbage Disposal Replacement',
        category: 'Plumbing',
        description: 'Remove old + install new unit',
        avgTimeMinutes: 75,
        baseLaborPrice: 125,
        materialCost: 90,
    },
    {
        id: '6',
        name: 'Door Hinge Adjustment',
        category: 'Carpentry',
        description: 'Tighten or replace hinges on interior door',
        avgTimeMinutes: 25,
        baseLaborPrice: 55,
        materialCost: 10,
    },
    // Add more Florida-specific ones later (hurricane prep, etc.)
];

export default function TemplatesScreen() {
    const { addLineItem } = useQuote();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [templates] = useState(initialTemplates);


    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addToQuote = (template: any) => {
        addLineItem({
            description: template.name,
            quantity: 1,
            unitPrice: template.baseLaborPrice + template.materialCost,
            isLabor: true,   // or false for pure material
        });

        Alert.alert('Added!', `"${template.name}" added to current quote`);
        router.push('/(tabs)/quotes/new');   // Go directly to quote builder
    };

    return (
        <View className="flex-1 bg-gray-50">
            <View className="bg-white px-6 py-4 border-b border-gray-200">
                <Text className="text-2xl font-bold">Job Templates</Text>
                <Text className="text-gray-500">Tap to add to new quote</Text>
            </View>

            {/* Search Bar */}
            <View className="px-6 pt-6">
                <View className="flex-row items-center bg-white rounded-2xl px-4 border border-gray-300">
                    <Search size={20} color="#6b7280" />
                    <TextInput
                        className="flex-1 py-4 px-3 text-base"
                        placeholder="Search templates... (faucet, drywall...)"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>
            </View>

            <ScrollView className="px-6 pt-6">
                {filteredTemplates.map((template) => (
                    <TouchableOpacity
                        key={template.id}
                        onPress={() => addToQuote(template)}
                        className="bg-white p-5 rounded-3xl mb-4 active:opacity-90"
                    >
                        <View className="flex-row justify-between">
                            <View className="flex-1">
                                <Text className="text-lg font-semibold">{template.name}</Text>
                                <Text className="text-blue-600 text-sm mt-1">{template.category}</Text>
                                <Text className="text-gray-600 mt-2 text-sm">{template.description}</Text>
                            </View>

                            <View className="items-end">
                                <Text className="text-2xl font-bold text-green-600">
                                    ${template.baseLaborPrice + template.materialCost}
                                </Text>
                                <Text className="text-xs text-gray-500 mt-1">
                                    {template.avgTimeMinutes} min
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={() => addToQuote(template)}
                            className="mt-4 bg-blue-100 py-3 rounded-2xl"
                        >
                            <Text className="text-blue-700 text-center font-medium">Add to Quote</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                ))}

                {filteredTemplates.length === 0 && (
                    <Text className="text-center text-gray-500 mt-10">No templates found</Text>
                )}
            </ScrollView>

            {/* Floating Add Button (for custom template later) */}
            <TouchableOpacity className="absolute bottom-8 right-8 bg-blue-600 w-16 h-16 rounded-full items-center justify-center shadow-lg">
                <Plus size={32} color="white" />
            </TouchableOpacity>
        </View>
    );
}