import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/store/AuthContext';
import { useThemeColors } from '@/store/ThemeContext';

export function AuthStartScreen() {
  const { colors } = useThemeColors();
  const { user, ready, token } = useAuth();

  useEffect(() => {
    if (!ready || !user) {
      return;
    }
    router.replace('/(tabs)/dashboard');
  }, [ready, user]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        inner: {
          flex: 1,
          justifyContent: 'center',
          minHeight: 400,
        },
        title: {
          fontSize: 24,
          fontWeight: '800',
          color: colors.text,
          marginBottom: 8,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: 15,
          color: colors.textMuted,
          lineHeight: 22,
          marginBottom: 28,
          textAlign: 'center',
        },
        gap: {
          marginTop: 12,
        },
        footnote: {
          marginTop: 24,
        },
        footnoteText: {
          fontSize: 12,
          color: colors.textMuted,
          lineHeight: 18,
          textAlign: 'center',
        },
        loadingWrap: {
          flex: 1,
          minHeight: 200,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }),
    [colors],
  );

  if (!ready || (token && !user)) {
    return (
      <AppScreen scroll>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </AppScreen>
    );
  }

  if (user) {
    return (
      <AppScreen scroll>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={styles.inner}>
        <Text style={styles.title}>Продолжить</Text>
        <Text style={styles.subtitle}>Войдите в существующий аккаунт или зарегистрируйтесь — данные синхронизируются с сервером.</Text>
        <PrimaryButton title="Войти" onPress={() => router.push('/login')} />
        <PrimaryButton
          title="Регистрация"
          variant="outline"
          onPress={() => router.push('/register')}
          style={styles.gap}
        />
        <View style={styles.footnote}>
          <Text style={styles.footnoteText}>
            Продолжая, вы соглашаетесь использовать FitTrack для персонального трекинга.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
