import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { buildNavigationTheme, darkColors, lightColors } from '@/constants/appTheme';

const STORAGE_KEY = '@fitness/theme_dark';

const ThemeContext = createContext({
  isDark: true,
  colors: darkColors,
  navigationTheme: buildNavigationTheme(darkColors, true),
  toggleTheme: () => {},
  setDark: () => {},
});

export function ThemeModeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && v !== null) {
          setIsDark(v === '1');
        }
      } catch (_) {
        /* ignore */
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const colors = isDark ? darkColors : lightColors;
  const navigationTheme = useMemo(() => buildNavigationTheme(colors, isDark), [colors, isDark]);

  const setDark = useCallback(async (dark) => {
    setIsDark(dark);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, dark ? '1' : '0');
    } catch (_) {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setDark(!isDark);
  }, [isDark, setDark]);

  const value = useMemo(
    () => ({
      isDark,
      colors,
      navigationTheme,
      toggleTheme,
      setDark,
      themeReady: ready,
    }),
    [isDark, colors, navigationTheme, toggleTheme, setDark, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeColors() {
  return useContext(ThemeContext);
}
