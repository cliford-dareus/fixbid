import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {Appearance, View, useColorScheme} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colorScheme as nwColorScheme} from 'nativewind';
import {themes} from '@/utils/color-themes';

const STORAGE_KEY = 'fixbid_theme_preference_v1';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextType = {
  /** User preference (includes system). */
  preference: ThemePreference;
  /** Effective theme after resolving system. */
  theme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
  ready: boolean;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function resolveTheme(
  preference: ThemePreference,
  system: 'light' | 'dark' | null | undefined,
): ResolvedTheme {
  if (preference === 'system') {
    return system === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (
          !cancelled &&
          (stored === 'light' || stored === 'dark' || stored === 'system')
        ) {
          setPreferenceState(stored);
        }
      } catch {
        // keep default
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const theme = useMemo(
    () => resolveTheme(preference, systemScheme),
    [preference, systemScheme],
  );

  // Keep NativeWind + RN appearance in sync with resolved theme
  useEffect(() => {
    try {
      nwColorScheme.set(theme);
    } catch {
      // nativewind may not be ready on web in some builds
    }
    try {
      Appearance.setColorScheme?.(theme);
    } catch {
      // older RN
    }
  }, [theme]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(theme === 'light' ? 'dark' : 'light');
  }, [theme, setPreference]);

  const value = useMemo(
    () => ({preference, theme, setPreference, toggleTheme, ready}),
    [preference, theme, setPreference, toggleTheme, ready],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        backgroundColor="transparent"
        translucent
        style={theme === 'dark' ? 'light' : 'dark'}
      />
      <View style={themes[theme]} className="flex-1 bg-background">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}

export default ThemeProvider;
