import {router, Tabs} from 'expo-router';
import {
    Activity,
    ArrowUpRight,
    BarChart3, Briefcase,
    FileText,
    Home,
    List,
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
import Animated, {
    FadeIn, FadeOut, useAnimatedStyle, useDerivedValue,
    withSpring, withTiming,
} from "react-native-reanimated";
import {GlassView} from "expo-glass-effect";
import {interpolateColor} from "react-native-reanimated/src";

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
                    name="jobs"
                    options={{
                        title: 'Jobs',
                        headerShown: false,
                        tabBarIcon: ({color}) => <Toolbox size={24} color={color}/>,
                    }}
                />
            </Tabs>
        </>
    );
}

// --- The Action Menu Component ---
function ActionMenu({menuVisible, onClose}: { menuVisible: boolean, onClose: () => void }) {
    const BUTTON_WIDTH = 64;
    const BUTTON_HEIGHT = 64;
    const MODAL_WIDTH = 200;
    const MODAL_HEIGHT = 230;

    const progress = useDerivedValue(() => {
        return withTiming(menuVisible ? 1 : 0, {duration: 50})
    });

    const animatedContainerStyle = useAnimatedStyle(() => {
        return {
            width: withSpring(menuVisible ? MODAL_WIDTH : BUTTON_WIDTH),
            height: withSpring(menuVisible ? "auto" : BUTTON_HEIGHT),
            borderRadius: withSpring(menuVisible ? 24 : 99999),
            // position: menuVisible ? 'absolute' : 'static',
            right: withSpring(menuVisible ? 116 : 0),

            backgroundColor: interpolateColor(
                progress.value,
                [0, 1],
                ['#f97316', '#18181BB2']
            ),
            transform: [
                {translateY: withSpring(menuVisible ? -90 : 0)},
                {translateX: menuVisible ? 100 : 0}
            ],

            elevation: menuVisible ? 50 : 5,
            zIndex: menuVisible ? 99999 : 0,
            shadowOpacity: withSpring(menuVisible ? 0.3 : 0.1),
        }
    })

    const customExiting = (values: any) => {
        'worklet';
        const animations = {
            originY: withTiming(0, {duration: 500}),
            opacity: withTiming(0, {duration: 700}),
            width: withTiming(64, {duration: 700}),
            height: withTiming(64, {duration: 700}),
            transform: [
                {scale: withTiming(0.5, {duration: 700})},
            ],
        }

        const initialValues = {
            originY: values.currentOriginY,
            width: values.currentWidth,
            height: values.currentHeight,
            opacity: 1,
            transform: [
                {scale: 1},
            ],
        }
        return {
            animations,
            initialValues,
        }
    };

    return (
        <Animated.View
            style={[{
                position: menuVisible ? 'absolute' : 'static',
                overflow: 'hidden',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 10},
                shadowRadius: 10,
                marginLeft: 16,
            }, animatedContainerStyle]}
            exiting={customExiting}
        >
            {!menuVisible &&
                <TouchableOpacity
                    onPress={onClose}
                    activeOpacity={0.7}
                    className="w-[64px] h-[64px] flex-1  items-center justify-center"
                    style={{transform: [{rotate: menuVisible ? '45deg' : '0deg'}]}}
                >
                    <Plus size={32} color="white" strokeWidth={3}/>
                </TouchableOpacity>}

            {menuVisible && <Animated.View
                className="w-full h-full"
                entering={FadeIn.delay(200)}
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
                    <MenuItem icon={<Trophy size={20} color="white"/>} label="Create Quote"
                              onPress="/quote/new" onClose={onClose}/>
                    <MenuItem icon={<User size={20} color="white"/>} label="Create Client"
                              onPress="/client/new" onClose={onClose}/>
                    <MenuItem icon={<Users size={20} color="white"/>} label="New Group"/>
                </GlassView>
            </Animated.View>}
        </Animated.View>
    );
}

function MenuItem({icon, label, showArrow, onPress, onClose}: {
    icon: any,
    label: string,
    showArrow?: boolean,
    onPress?: any,
    onClose?: any
}) {
    const closeMenu = () => {
        onClose()
    }

    return (
        <TouchableOpacity
            onPress={() => {
                closeMenu()
                router.push(onPress)
            }}
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
            <View className="absolute bottom-10 w-full flex-row items-center justify-center px-4">
                {/* The Pill-Shaped Container */}
                <View
                    className="flex-1 flex-row flex-shrink bg-secondary-foreground border border-zinc-800 rounded-full h-16 items-center justify-between px-2 shadow-lg">
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
                            jobs: (props: any) => <Briefcase {...props} />
                        };

                        const Icon = icons[route.name];

                        return (
                            <TouchableOpacity
                                key={route.key}
                                onPress={onPress}
                                className={`relative items-center justify-center p-3 rounded-full ${isFocused ? 'bg-zinc-800' : ''}`}
                            >
                                {Icon && <Icon
                                    size={24}
                                    color={isFocused ? '#f97316' : '#71717a'}
                                    className="z-50"
                                />}
                                {isFocused &&
                                    <GlassView
                                        glassEffectStyle="clear"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            // width: '100%',
                                            borderRadius: 24,
                                            zIndex: -1,
                                            isolation: 'isolate',
                                            backgroundColor: 'rgb(24 24 27/0.7)',
                                        }}
                                    />}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Action Menu Button/Modal */}
                <ActionMenu menuVisible={isMenuOpen} onClose={onPlusPress}/>

                {/* The Action Menu Overlay */}
                {isMenuOpen &&
                    <View style={{width: 66, height: 65}} className="ml-4 border border-transparent rounded-full"/>}
            </View>

            {isMenuOpen && <Pressable onPress={onPlusPress} className="absolute inset-0 z-40 bg-black/5">
                <Animated.View entering={FadeIn} exiting={FadeOut} style={{}}/>
            </Pressable>}
        </>
    );
}