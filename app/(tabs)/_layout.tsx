import {router, Tabs} from 'expo-router';
import {FileText, Home, List, LogOut, Toolbox, User} from 'lucide-react-native';
import {Platform, View} from 'react-native';
import {useAuth} from "@/context/auth-context";
import {useEffect} from "react";
import {BlurView} from "expo-blur";
import useThemedNavigation from "@/hooks/use-navigation-theme";
import {isLiquidGlassAvailable} from "expo-glass-effect";
import {Icon, Label, NativeTabs} from "expo-router/unstable-native-tabs";

function NativeTabLayout() {
    return (
        <NativeTabs>
            <NativeTabs.Trigger name="index">
                <Icon sf={{default: "house", selected: "house.fill"}}/>
                <Label>Dashboard</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="quotes">
                <Icon sf={{default: "text.page", selected: "text.page.fill"}}/>
                <Label>Quotes</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="templates">
                <Icon sf={{default: "doc.text", selected: "doc.text.fill"}}/>
                <Label>Templates</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="clients">
                <Icon sf={{default: "doc.text", selected: "doc.text.fill"}}/>
                <Label>Clients</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="profile">
                <Icon sf={{default: "person.2", selected: "person.2.fill"}}/>
                <Label>Profile</Label>
            </NativeTabs.Trigger>
            {/*<NativeTabs.Trigger name="calculator">*/}
            {/*    <Icon sf={{default: "chart.bar", selected: "chart.bar.fill"}}/>*/}
            {/*    <Label>Margins</Label>*/}
            {/*</NativeTabs.Trigger>*/}
        </NativeTabs>
    );
}

function ClassicTabLayout() {
    const {user, session, signOut} = useAuth();
    const isIOS = Platform.OS === "ios";
    const isWeb = Platform.OS === "web";
    const {isDark, colors} = useThemedNavigation()

    useEffect(() => {
        if (user && session) {
            router.replace('/(tabs)');
        }
    }, [session, user]);

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#3b82f6',
                tabBarInactiveTintColor: '#6b7280',
                headerShown: false,
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
                    title: 'Dashboard',
                    tabBarIcon: ({color}) => <Home size={24} color={color}/>, // import Home from lucide-react-native
                }}
            />
            <Tabs.Screen
                name="quotes"
                options={{
                    title: 'Quotes',
                    tabBarIcon: ({color}) => <FileText size={24} color={color}/>,
                }}
            />
            <Tabs.Screen
                name="templates"
                options={{
                    title: 'Templates',
                    tabBarIcon: ({color}) => <List size={24} color={color}/>,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
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
    );
}

export default function TabLayout() {
    if (isLiquidGlassAvailable()) {
        return <NativeTabLayout/>;
    }
    return <ClassicTabLayout/>;
}
