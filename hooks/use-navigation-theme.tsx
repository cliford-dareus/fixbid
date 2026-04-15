import React, {useEffect} from 'react';
import {Platform, StatusBar as RNStatusBar} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {useTheme} from "@/hooks/use-theme";
import useThemeColors from "@/hooks/use-theme-color";
import * as NavigationBar from 'expo-navigation-bar';

export default function useThemedNavigation() {
    const {theme} = useTheme();
    const colors = useThemeColors();
    const isDark = theme === 'dark';


    useEffect(() => {
        if (Platform.OS === 'android') {
            NavigationBar.setBackgroundColorAsync(colors.background);
            NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');

        }
    }, [isDark, colors.background]);
    const ThemedStatusBar = () => (
        <StatusBar
            style={isDark ? 'light' : 'dark'}
            backgroundColor="transparent"
            translucent={true}
        />
    );

    const screenOptions = {
        headerShown: false,
        backgroundColor: colors.background,
        contentStyle: {
            backgroundColor: colors.background
        }
    };

    return {
        ThemedStatusBar,
        screenOptions,
        colors,
        isDark
    };
}