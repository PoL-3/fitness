import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LabeledInput } from '@/components/LabeledInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/store/AuthContext';
import { useThemeColors } from '@/store/ThemeContext';
import { isValidEmail, validateRequired } from '@/utils/validation';

export function RegisterScreen() {
  const { register } = useAuth();
  const { colors } = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError('');
    const e1 = validateRequired(email, 'Email');
    if (e1) {
      setError(e1);
      return;
    }
    if (!isValidEmail(email)) {
      setError('Некорректный email');
      return;
    }
    if (!password || password.length < 6) {
      setError('Пароль минимум 6 символов');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim());
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      setError(err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen scroll>
      <ScreenHeader title="Регистрация" subtitle="Создаётся запись в PostgreSQL через API" />
      {error ? <Text style={[styles.err, { color: colors.warning }]}>{error}</Text> : null}
      <LabeledInput label="Имя (необязательно)" value={displayName} onChangeText={setDisplayName} />
      <LabeledInput label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <LabeledInput label="Пароль (≥6 символов)" secureTextEntry value={password} onChangeText={setPassword} />
      <PrimaryButton title="Зарегистрироваться" onPress={handleRegister} loading={loading} />
      <Link href="/login" asChild>
        <Pressable style={styles.linkWrap}>
          <Text style={[styles.link, { color: colors.accent }]}>Уже есть аккаунт — войти</Text>
        </Pressable>
      </Link>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  err: {
    marginBottom: 12,
    fontWeight: '600',
  },
  linkWrap: {
    marginTop: 16,
    paddingVertical: 8,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
  },
});
