import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/store/AuthContext';
import { useThemeColors } from '@/store/ThemeContext';

export function WelcomeScreen() {
  const { colors } = useThemeColors();
  const { user } = useAuth();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        inner: {
          flex: 1,
          justifyContent: 'center',
          minHeight: 480,
        },
        logo: {
          width: 100,
          height: 100,
          alignSelf: 'center',
          marginBottom: 20,
          borderRadius: 20,
        },
        badge: {
          alignSelf: 'flex-start',
          backgroundColor: colors.surface2,
          color: colors.accent,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          fontWeight: '800',
          fontSize: 13,
          marginBottom: 16,
          overflow: 'hidden',
        },
        title: {
          fontSize: 30,
          fontWeight: '800',
          color: colors.text,
          lineHeight: 38,
          marginBottom: 10,
        },
        text: {
          fontSize: 15,
          color: colors.textMuted,
          lineHeight: 22,
          marginBottom: 24,
        },
        link: {
          marginTop: 12,
          paddingVertical: 0,
        },
      }),
    [colors],
  );

  return (
    <AppScreen scroll>
      <View style={styles.inner}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} contentFit="contain" />
        <Text style={styles.badge}>FitTrack</Text>
        <Text style={styles.title}>{user?.displayName ? `Добро пожаловать, ${user.displayName}` : 'Добро пожаловать в FitTrack'}</Text>
        <Text style={styles.text}>
          Минималистичный дневник тренировок, питания и целей. Войдите, чтобы синхронизировать данные.
        </Text>
        <PrimaryButton title="Войти" onPress={() => router.push('/login')} />
        <PrimaryButton title="Регистрация" variant="outline" onPress={() => router.push('/register')} style={styles.link} />
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.text, { marginBottom: 0, fontSize: 13 }]}>
            Продолжая, вы соглашаетесь использовать FitTrack для персонального трекинга.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
