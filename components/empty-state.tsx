import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import useThemedNavigation from "@/hooks/use-navigation-theme";

interface EmptyStateProps {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
    const {colors} = useThemedNavigation();

    return (
        <View className="flex-1 items-center justify-center px-10 gap-3">
            <View
                className="bg-muted-foreground h-18 w-18 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.secondary }}
            >
                <Feather name={icon} size={32} color={colors.icon} />
            </View>

            <Text className="text-foreground text-[18px] font-bold text-center">
                {title}
            </Text>

            <Text className="text-foreground text-[14px] text-center leading-5">
                {subtitle}
            </Text>

            {actionLabel && onAction && (
                <TouchableOpacity
                    className="mt-2 rounded-xl px-6 py-3"
                    style={{ backgroundColor: colors.primary }}
                    onPress={onAction}
                    activeOpacity={0.8}
                >
                    <Text className="text-primary-foreground text-[15px] font-semibold">
                        {actionLabel}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
