import { DarkTheme, DefaultTheme } from '@react-navigation/native';

/** Тёмная тема (как раньше) */
export const darkColors = {
  bg: '#0b1220',
  surface: '#111827',
  surface2: '#1f2937',
  border: '#334155',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#22c55e',
  accentDim: '#16a34a',
  warning: '#fbbf24',
  chipSelectedBg: '#14532d',
};

/** Светлая тема */
export const lightColors = {
  bg: '#f1f5f9',
  surface: '#ffffff',
  surface2: '#e2e8f0',
  border: '#cbd5e1',
  text: '#0f172a',
  textMuted: '#64748b',
  accent: '#16a34a',
  accentDim: '#15803d',
  warning: '#d97706',
  chipSelectedBg: '#dcfce7',
};

export function buildNavigationTheme(colors, isDark = true) {
  const ThemeBase = isDark ? DarkTheme : DefaultTheme;
  return {
    ...ThemeBase,
    colors: {
      ...ThemeBase.colors,
      primary: colors.accent,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };
}

/** Обратная совместимость: по умолчанию тёмная палитра */
export const colors = darkColors;
export const navigationDarkTheme = buildNavigationTheme(darkColors, true);
