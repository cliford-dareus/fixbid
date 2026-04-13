import {router, Tabs} from 'expo-router';
import {FileText, Home, List, LogOut, Toolbox} from 'lucide-react-native';
import {TouchableOpacity} from 'react-native';
import {useAuth} from "@/context/auth-context";
import {useEffect} from "react";

export default function TabsLayout() {
    const {user, session, signOut} = useAuth();

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
                headerRight: () => (
                    <TouchableOpacity onPress={signOut} className="mr-4">
                        <LogOut size={24} color="#ef4444"/>
                    </TouchableOpacity>
                ),
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
