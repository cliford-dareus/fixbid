import React, {useState} from 'react';
import {View, Text, TouchableOpacity, TextInput, Platform, FlatList} from 'react-native';
import {router} from 'expo-router';
import {Plus} from 'lucide-react-native';
import {calculateJobCost, CATEGORIES, JOB_TEMPLATES, JobTemplate} from "@/data/templates";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {Feather} from "@expo/vector-icons";
import {cn} from "@/lib/utils";
import {BlurView} from "expo-blur";
import useThemedNavigation from "@/hooks/use-navigation-theme";

export default function TemplatesScreen() {
    const insets = useSafeAreaInsets();
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
    const {isDark, isWeb, isIOS} = useThemedNavigation()

    const filtered = JOB_TEMPLATES.filter((t) => {
        const matchSearch =
            !search ||
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.category.toLowerCase().includes(search.toLowerCase());
        const matchCat = !activeCategory || t.category === activeCategory;
        return matchSearch && matchCat;
    });

    return (
        <View className="flex-1 bg-background pt-[40px]">
            <View className="absolute top-14 h-[60px] w-full flex-row justify-between items-center px-6">
                <TouchableOpacity
                    className="bg-secondary-foreground w-12 h-12 rounded-full flex-row items-center justify-center border border-zinc-300 z-50">
                    <Feather name="user" size={24} color="white"/>
                </TouchableOpacity>

                {isIOS ? (
                    <BlurView
                        intensity={100}
                        tint={isDark ? "dark" : "light"}
                        className="absolute inset-0"
                    />
                ) : isWeb ? (
                    <View className="absolute inset-0 bg-background"/>
                ) : null}
            </View>

            {/* Header */}
            <View style={{paddingTop: topPad + 16}} className="px-5 py-2">
                <Text className="text-foreground text-2xl font-extrabold -tracking-tighter mb-[2px]">Job
                    Templates</Text>
                <Text className="text-muted-foreground text-xs mb-[14px]">
                    {JOB_TEMPLATES.length} templates ready
                </Text>
                <View className="bg-card border border-zinc-300 flex-row items-center gap-3 rounded-2xl px-4 py-2 mb-3">
                    <Feather name="search" size={16} color="white"/>
                    <TextInput
                        className="flex-1 text-sm"
                        placeholder="Search templates..."
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch("")}>
                            <Feather name="x" size={16}/>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Category Chips */}
                <FlatList
                    horizontal
                    data={["All", ...CATEGORIES]}
                    keyExtractor={(item) => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        gap: 8, marginTop: 8,
                    }}
                    renderItem={({item}) => {
                        const isActive = item === "All" ? !activeCategory : activeCategory === item;
                        return (
                            <TouchableOpacity
                                className={cn("gap-2 mt-2 border border-zinc-300 px-4 py-2 rounded-3xl",
                                    isActive ? "bg-primary border-primary" : "bg-card"
                                )}
                                onPress={() => setActiveCategory(item === "All" ? null : item)}
                                activeOpacity={0.8}
                            >
                                <Text
                                    className={cn("text-sm font-semibold", isActive ? "text-primary-foreground" : "text-foreground")}
                                >
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* Templates List */}
            <FlatList
                data={filtered}
                keyExtractor={(t) => t.id}
                contentContainerStyle={{paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100}}
                renderItem={({item}) => <TemplateCard template={item}/>}
                ListEmptyComponent={
                    <View className="flex-row items-center justify-center pt-[80px] gap-[12px]">
                        <Feather name="search" size={32} color=""/>
                        <Text className="text-foreground text-[15px]">
                            No templates found
                        </Text>
                    </View>
                }
            />

            {/* Floating Add Button (for custom template later) */}
            <TouchableOpacity
                className="absolute bottom-8 right-8 bg-blue-600 w-16 h-16 rounded-full items-center justify-center shadow-lg">
                <Plus size={32} color="white"/>
            </TouchableOpacity>
        </View>
    );
};

function TemplateCard({
                          template,
                      }: {
    template: JobTemplate;
}) {
    const cost = calculateJobCost(template);
    const diffColor =
        template.difficulty === "easy"
            ? "#16A34A"
            : template.difficulty === "medium"
                ? "#D97706"
                : "#DC2626";

    return (
        <TouchableOpacity
            className="bg-card rounded-3xl mb-4 gap-2 p-5"
            onPress={() => router.push(`/template/${template.id}`)}
            activeOpacity={0.8}
        >
            <View className="flex-row justify-between items-start">
                <View className="flex-1 gap-[2px]">
                    <Text className="text-primary text-[11px] font-semibold tracking-wider"
                          style={{textTransform: "uppercase"}}>
                        {template.category}
                    </Text>
                    <Text className="text-foreground font-bold" numberOfLines={1}>
                        {template.name}
                    </Text>
                </View>
                <View className="items-end gap-1">
                    <Text className="text-foreground text-[18px] font-extrabold">
                        ${cost.suggested}
                    </Text>
                    <View className="px-2 py-[2px] rounded-5 bg-card" style={{backgroundColor: diffColor + 18}}>
                        <Text className="font-semibold text-[11px]" style={{color: diffColor}}>
                            {template.difficulty}
                        </Text>
                    </View>
                </View>
            </View>
            <View className="flex-row gap-4">
                <View className="flex-row items-center gap-1">
                    <Feather name="clock" size={12} color="white"/>
                    <Text className="text-xs text-muted-foreground">
                        {template.timeEstimateHours}h
                    </Text>
                </View>
                <View className="flex-row items-center gap-1">
                    <Feather name="package" size={12} color="white"/>
                    <Text className="text-xs text-muted-foreground">
                        {template.materials.length} materials
                    </Text>
                </View>
                <View className="flex-row items-center gap-1">
                    <Feather name="trending-up" size={12} color="white"/>
                    <Text className="text-xs text-muted-foreground">
                        {template.commonUpsells.length} upsells
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}