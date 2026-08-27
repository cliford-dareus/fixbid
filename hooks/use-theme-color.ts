import {useTheme} from '@/hooks/use-theme';

const useThemeColors = () => {
  const {theme} = useTheme();
  const isDark = theme === 'dark';

  return {
    icon: isDark ? '#fafafa' : '#0f172a',
    background: isDark ? '#09090b' : '#f8fafc',
    primary: '#f97316',
    secondary: isDark ? '#27272a' : '#e2e8f0',
    invert: isDark ? '#000000' : '#ffffff',
    state: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    faded: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255, 255, 255, 0.9)',
    sheet: isDark ? '#18181b' : '#ffffff',
    highlight: '#f97316',
    lightDark: isDark ? '#27272a' : '#ffffff',
    border: isDark ? '#27272a' : '#e2e8f0',
    text: isDark ? '#fafafa' : '#0f172a',
    foreground: isDark ? '#fafafa' : '#0f172a',
    mutedForeground: isDark ? '#a1a1aa' : '#64748b',
    placeholder: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    switch: isDark ? 'rgba(255,255,255,0.4)' : '#ccc',
    chatBg: isDark ? '#27272a' : '#efefef',
    isDark,
  };
};

export default useThemeColors;
