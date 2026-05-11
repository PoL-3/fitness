import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LabeledInput } from '@/components/LabeledInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { apiJson, getApiBaseUrl } from '@/constants/api';
import { useAuth } from '@/store/AuthContext';
import { useThemeColors } from '@/store/ThemeContext';
import { isValidEmail, validateRequired } from '@/utils/validation';

export function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [diag, setDiag] = useState('');
  const [diagLoading, setDiagLoading] = useState(false);

  async function handleLogin() {
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
    const e2 = validateRequired(password, 'Пароль');
    if (e2) {
      setError(e2);
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      setError(err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckApi() {
    setDiagLoading(true);
    try {
      const base = getApiBaseUrl();
      const { res, data } = await apiJson('/health');
      if (res.ok) {
        setDiag(`API OK: ${base} | db=${data?.db || 'unknown'}`);
      } else {
        setDiag(`API ответил ${res.status}: ${base}`);
      }
    } catch (e) {
      setDiag(`Сеть недоступна: ${getApiBaseUrl()} | ${e?.message || 'fetch failed'}`);
    } finally {
      setDiagLoading(false);
    }
  }

  return (
    <AppScreen scroll>
      <ScreenHeader title="Вход" subtitle="Email и пароль (данные на вашем backend)" />
      {error ? <Text style={[styles.err, { color: colors.warning }]}>{error}</Text> : null}
      <LabeledInput label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <LabeledInput label="Пароль" secureTextEntry value={password} onChangeText={setPassword} />
      <PrimaryButton title="Войти" onPress={handleLogin} loading={loading} />
      <PrimaryButton
        title="Проверить подключение к API"
        variant="outline"
        onPress={handleCheckApi}
        loading={diagLoading}
        style={styles.diagBtn}
      />
      <Text style={[styles.diagText, { color: colors.textMuted }]}>API URL: {getApiBaseUrl()}</Text>
      {diag ? <Text style={[styles.diagText, { color: colors.textMuted }]}>{diag}</Text> : null}
      <Link href="/register" asChild>
        <Pressable style={styles.linkWrap}>
          <Text style={[styles.link, { color: colors.accent }]}>Нет аккаунта — зарегистрироваться</Text>
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
  diagBtn: {
    marginTop: 10,
  },
  diagText: {
    marginTop: 8,
    fontSize: 12,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
  },
});
