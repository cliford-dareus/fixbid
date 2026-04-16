import React, { createContext, useState } from "react";
import {View} from "react-native";
import { StatusBar } from "expo-status-bar";
import { colorScheme } from "nativewind";
import {themes} from "@/utils/color-themes";

interface ThemeProviderProps {
    children: React.ReactNode;
}

type ThemeContextType = {
    theme: "light" | "dark";
    toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
    theme: "dark",
    toggleTheme: () => { },
});

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");

    const toggleTheme = () => {
        const newTheme = currentTheme === "light" ? "dark" : "light";
        setCurrentTheme(newTheme);
        colorScheme.set(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme: currentTheme, toggleTheme}}>
            <StatusBar backgroundColor="transparent" translucent={true} style={currentTheme === "dark" ? "light" : "dark"} />
            <View style={themes[currentTheme]} className="flex-1 bg-background">
                {children}
            </View>
        </ThemeContext.Provider>
    );
};

export default ThemeProvider;