import {router, Tabs} from 'expo-router';
import {
    Activity,
    ArrowUpRight,
    BarChart3,
    FileText,
    Home,
    List,
    LogOut,
    MessageCircle,
    Plus,
    Toolbox,
    Trophy,
    User, Users
} from 'lucide-react-native';
import {Platform, Pressable, Text, TouchableOpacity, View} from 'react-native';
import {useAuth} from "@/context/auth-context";
import React, {useEffect, useState} from "react";
import {BlurView} from "expo-blur";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import Animated, {CSSAnimationKeyframes, Keyframe, ZoomInDown, ZoomOutEasyDown} from "react-native-reanimated";
import {GlassView} from "expo-glass-effect";

export default function ClassicTabLayout() {
    const {user, session, signOut} = useAuth();
    const isIOS = Platform.OS === "ios";
    const isWeb = Platform.OS === "web";
    const {isDark, colors} = useThemedNavigation();
    const [menuVisible, setMenuVisible] = useState(false);

    useEffect(() => {
        if (user && session) {
            router.replace('/(tabs)');
        }
    }, [session, user]);

    return (
        <>
            <Tabs
                tabBar={(props) => (
                    <CustomTabBar
                        {...props}
                        isMenuOpen={menuVisible}
                        onPlusPress={() => setMenuVisible(!menuVisible)}
                    />
                )}
                screenOptions={{
                    tabBarActiveTintColor: '#3b82f6',
                    tabBarInactiveTintColor: '#6b7280',
                    headerShown: true,
                    tabBarStyle: {
                        position: "absolute",
                        backgroundColor: isIOS ? "transparent" : colors.background,
                        borderTopWidth: isWeb ? 1 : 0,
                        borderTopColor: colors.border,
                        elevation: 0,
                        ...(isWeb ? {height: 84} : {}),
                    },
                    tabBarBackground: () =>
                        isIOS ? (
                            <BlurView
                                intensity={100}
                                tint={isDark ? "dark" : "light"}
                                className="absolute inset-0"
                            />
                        ) : isWeb ? (
                            <View className="absolute inset-0 bg-background"/>
                        ) : null,
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        headerShown: false,
                        title: 'Dashboard',
                        tabBarIcon: ({color}) => <Home size={24} color={color}/>, // import Home from lucide-react-native
                    }}
                />
                <Tabs.Screen
                    name="quotes"
                    options={{
                        headerShown: false,
                        title: 'Quotes',
                        tabBarIcon: ({color}) => <FileText size={24} color={color}/>,
                    }}
                />
                <Tabs.Screen
                    name="templates"
                    options={{
                        headerShown: false,
                        title: 'Templates',
                        tabBarIcon: ({color}) => <List size={24} color={color}/>,
                    }}
                />
                <Tabs.Screen
                    name="clients"
                    options={{
                        headerShown: false,
                        title: 'Clients',
                        tabBarIcon: ({color}) => <User size={24} color={color}/>
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        headerShown: false,
                        title: 'Profile',
                        tabBarIcon: ({color}) => <User size={24} color={color}/>
                    }}
                />

                {/*<Tabs.Screen*/}
                {/*    name="jobs"*/}
                {/*    options={{*/}
                {/*        title: 'Jobs',*/}
                {/*        tabBarIcon: ({ color }) => <Toolbox size={24} color={color} />,*/}
                {/*    }}*/}
                {/*/>*/}
            </Tabs>

            {/* The Action Menu Overlay */}
            <ActionMenu menuVisible={menuVisible} onClose={() => setMenuVisible(false)}/>
        </>
    );
}

const animateMenu: CSSAnimationKeyframes = {
    '0%': {
        bottom: -80,
        right: -70,
        transform: 'scale(0)',
    },
    '100%': {
        right: 16,
        bottom: 100,
    },
};

// --- The Action Menu Component ---
function ActionMenu({menuVisible, onClose}: { menuVisible: boolean, onClose: () => void }) {
    return (
        <>
            {menuVisible && <Pressable onPress={onClose} className="absolute inset-0 z-40 bg-black/5">
                <Animated.View
                    style={{
                        animationName: animateMenu,
                        animationDuration: 500,
                        animationTimingFunction: 'ease-in-out',
                        animationDelay: 5,
                        animationFillMode: 'forwards',
                    }}
                    entering={ZoomInDown}
                    exiting={ZoomOutEasyDown}
                    className="absolute right-[-70] w-64 overflow-hidden rounded-[32px] border border-white/10 shadow-2xl"
                >
                    <GlassView
                        style={{
                            padding: 16,
                            borderRadius: 24,
                            backgroundColor: 'rgb(24 24 27/0.7)',
                        }}
                        glassEffectStyle="clear"
                    >
                        {/* Section 1 */}
                        <MenuItem icon={<Activity size={20} color="#22c55e"/>} label="Jobs Statistics"
                                  onPress="/jobs/stats"/>
                        {/*<MenuItem icon={<Utensils size={20} color="#f97316" />} label="Track Calories" showArrow />*/}
                        {/*<MenuItem icon={<Heart size={20} color="#ef4444" />} label="Track Heart Rate" showArrow />*/}
                        {/*<MenuItem icon={<Scale size={20} color="#06b6d4" />} label="Log Weight" />*/}

                        {/* Divider */}
                        <View className="h-[1px] bg-white/10 my-3 mx-2"/>

                        {/* Section 2 */}
                        <MenuItem icon={<Trophy size={20} color="white"/>} label="Create Quote" onPress="/quote/new"/>
                        <MenuItem icon={<User size={20} color="white"/>} label="Create Client" onPress="/client/new"/>
                        <MenuItem icon={<Users size={20} color="white"/>} label="New Group"/>
                    </GlassView>
                </Animated.View>
            </Pressable>}
        </>
    );
}

function MenuItem({icon, label, showArrow, onPress}: { icon: any, label: string, showArrow?: boolean, onPress?: any }) {
    return (
        <TouchableOpacity
            onPress={() => router.push(onPress)}
            className="flex-row items-center justify-between py-3 px-2 active:bg-white/10 rounded-xl">
            <View className="flex-row items-center">
                <View className="mr-3">{icon}</View>
                <Text className="text-zinc-200 text-lg font-medium">{label}</Text>
            </View>
            {showArrow && <ArrowUpRight size={16} color="#9ca3af"/>}
        </TouchableOpacity>
    );
}

function CustomTabBar({state, navigation, onPlusPress, isMenuOpen}: any) {
    return (
        <>
            <View className="absolute bottom-10 w-full flex-row items-center justify-center px-5">
                {/* 1. The Pill-Shaped Container */}
                <View
                    className="flex-1 flex-row bg-zinc-900/90 border border-zinc-800 rounded-full h-16 items-center justify-around px-2 shadow-lg">
                    {state.routes.filter((route: any) => route.name !== "profile").map((route: any, index: number) => {
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });
                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        // Icon Mapping
                        const icons: any = {
                            index: (props: any) => <Home {...props} />,
                            quotes: (props: any) => <Trophy {...props} />,
                            templates: (props: any) => <MessageCircle {...props} />,
                            clients: (props: any) => <BarChart3 {...props} />,
                        };

                        const Icon = icons[route.name];

                        return (
                            <TouchableOpacity
                                key={route.key}
                                onPress={onPress}
                                className={`items-center justify-center p-3 rounded-full ${isFocused ? 'bg-zinc-800' : ''}`}
                            >
                                {Icon && <Icon
                                    size={24}
                                    color={isFocused ? '#06b6d4' : '#71717a'}
                                />}
                                {isFocused && <View className="w-1 h-1 bg-cyan-500 rounded-full mt-1"/>}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity
                    onPress={onPlusPress}
                    activeOpacity={0.7}
                    className={`ml-4 w-16 h-16 rounded-full items-center justify-center shadow-lg ${isMenuOpen ? 'bg-zinc-800 rotate-45' : 'bg-cyan-600'}`}
                    style={{transform: [{rotate: isMenuOpen ? '45deg' : '0deg'}]}}
                >
                    <Plus size={32} color="white" strokeWidth={3}/>
                </TouchableOpacity>
            </View>
        </>
    );
}