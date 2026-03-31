import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { Card } from '@/components/Card';
import { LabeledInput } from '@/components/LabeledInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/store/AuthContext';
import { useThemeColors } from '@/store/ThemeContext';
import {
  cancelAllReminders,
  ensureNotificationPermission,
  scheduleDailyReminder,
} from '@/utils/notifications';
import { parseOptionalPositiveNumber } from '@/utils/validation';

export function ProfileScreen() {
  const { user, token, logout, setAvatarUri, avatarUri, updateProfileRemote } = useAuth();
  const { colors, isDark, setDark } = useThemeColors();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [gender, setGender] = useState(
    user?.gender === 'male' || user?.gender === 'female' || user?.gender === 'other' ? user.gender : null,
  );
  const [age, setAge] = useState(user?.age != null ? String(user.age) : '');
  const [birthDate, setBirthDate] = useState('');
  const [heightCm, setHeightCm] = useState(user?.heightCm != null ? String(user.heightCm) : '');
  const [weightKg, setWeightKg] = useState(user?.weightKg != null ? String(user.weightKg) : '');
  const [reminderHour, setReminderHour] = useState('9');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  function computeAgeYears(bd) {
    if (!bd || typeof bd !== 'string') return null;
    const s = bd.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const birth = new Date(`${s}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      years -= 1;
    }
    return years >= 0 ? years : null;
  }

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setGender(user.gender === 'male' || user.gender === 'female' || user.gender === 'other' ? user.gender : null);
      setAge(user.age != null ? String(user.age) : '');
      setHeightCm(user.heightCm != null ? String(user.heightCm) : '');
      setWeightKg(user.weightKg != null ? String(user.weightKg) : '');
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      try {
        const key = `@fitness/birthday:${user.id}`;
        const stored = await AsyncStorage.getItem(key);
        if (!cancelled && stored) {
          setBirthDate(stored);
          const years = computeAgeYears(stored);
          if (years != null) {
            setAge(String(years));
          }
        }
      } catch (_) {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setMsg('Нет доступа к галерее');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      await setAvatarUri(res.assets[0].uri);
      setMsg('Аватар обновлён (локально)');
    }
  }

  async function saveProfile() {
    setMsg('');
    if (!token) {
      setMsg('Войдите, чтобы сохранить антропометрию на сервер');
      return;
    }
    const computedAge = birthDate ? computeAgeYears(birthDate) : null;
    if (birthDate && computedAge == null) {
      setMsg('Дата рождения должна быть в формате ГГГГ-ММ-ДД');
      return;
    }
    const a = parseOptionalPositiveNumber(age, 'Возраст', 120);
    const h = parseOptionalPositiveNumber(heightCm, 'Рост', 300);
    const w = parseOptionalPositiveNumber(weightKg, 'Вес', 400);
    if (!a.ok) {
      setMsg(a.error);
      return;
    }
    if (!h.ok) {
      setMsg(h.error);
      return;
    }
    if (!w.ok) {
      setMsg(w.error);
      return;
    }
    setLoading(true);
    try {
      await updateProfileRemote({
        displayName: displayName.trim() || null,
        age: computedAge != null ? computedAge : a.value,
        heightCm: h.value,
        weightKg: w.value,
        gender,
      });
      if (computedAge != null && birthDate) {
        const key = `@fitness/birthday:${user?.id}`;
        await AsyncStorage.setItem(key, birthDate);
      }
      setMsg('Профиль сохранён');
    } catch (e) {
      setMsg(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function enableReminder() {
    setMsg('');
    const h = parseInt(reminderHour, 10);
    if (!Number.isFinite(h) || h < 0 || h > 23) {
      setMsg('Час 0–23');
      return;
    }
    const ok = await ensureNotificationPermission();
    if (!ok) {
      setMsg('Разрешите уведомления в настройках');
      return;
    }
    await scheduleDailyReminder(h, 0, 'FitTrack', 'Время проверить план и тренировку');
    setMsg(`Напоминание каждый день в ${h}:00`);
  }

  return (
    <AppScreen scroll>
      <ScreenHeader title="Профиль" subtitle="Аккаунт, тема, напоминания, аватар" />

      <Card style={styles.card}>
        <Text style={[styles.label, { color: colors.accent }]}>Аватар (галерея)</Text>
        <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPh, { backgroundColor: colors.surface2 }]}>
              <Text style={{ color: colors.textMuted }}>Нажмите, чтобы выбрать фото</Text>
            </View>
          )}
        </Pressable>
        {avatarUri ? (
          <PrimaryButton
            title="Удалить аватар"
            variant="outline"
            onPress={async () => {
              await setAvatarUri(null);
              setMsg('Аватар удалён');
            }}
            style={styles.gap}
          />
        ) : null}
      </Card>

      {user ? (
        <Card style={styles.card}>
          <Text style={[styles.label, { color: colors.accent }]}>Аккаунт</Text>
          <Text style={[styles.email, { color: colors.text }]}>{user.email}</Text>
          <LabeledInput label="Имя" value={displayName} onChangeText={setDisplayName} />
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Пол</Text>
          <View style={styles.genderRow}>
            <GenderChip
              label="Мужской"
              selected={gender === 'male'}
              onPress={() => setGender('male')}
              colors={colors}
            />
            <GenderChip
              label="Женский"
              selected={gender === 'female'}
              onPress={() => setGender('female')}
              colors={colors}
            />
            <GenderChip
              label="Другой"
              selected={gender === 'other'}
              onPress={() => setGender('other')}
              colors={colors}
            />
            <GenderChip label="Не указан" selected={gender == null} onPress={() => setGender(null)} colors={colors} />
          </View>
          {!birthDate ? (
            <LabeledInput
              label="Дата рождения (YYYY-MM-DD)"
              value={birthDate}
              onChangeText={(t) => {
                setBirthDate(t);
                const years = computeAgeYears(t);
                if (years != null) {
                  setAge(String(years));
                }
              }}
            />
          ) : null}
          <LabeledInput label="Возраст" keyboardType="number-pad" value={age} editable={false} />
          <LabeledInput label="Рост (см)" keyboardType="decimal-pad" value={heightCm} onChangeText={setHeightCm} />
          <LabeledInput label="Вес (кг)" keyboardType="decimal-pad" value={weightKg} onChangeText={setWeightKg} />
          <PrimaryButton title="Сохранить в облако" onPress={saveProfile} loading={loading} />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Вы не вошли в аккаунт. Данные дневника всё равно хранятся на устройстве.
          </Text>
          <PrimaryButton title="Войти" onPress={() => router.push('/login')} />
          <PrimaryButton title="Регистрация" variant="outline" onPress={() => router.push('/register')} style={styles.gap} />
        </Card>
      )}

      <Card style={styles.card}>
        <Text style={[styles.label, { color: colors.accent }]}>Тема</Text>
        <View style={styles.row}>
          <Text style={[styles.body, { color: colors.text }]}>Тёмная тема</Text>
          <Switch value={isDark} onValueChange={setDark} trackColor={{ false: '#94a3b8', true: colors.accent }} />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.label, { color: colors.accent }]}>Уведомления</Text>
        <LabeledInput label="Час напоминания (0–23)" keyboardType="number-pad" value={reminderHour} onChangeText={setReminderHour} />
        <PrimaryButton title="Включить ежедневное напоминание" onPress={enableReminder} />
        <PrimaryButton title="Отключить все" variant="outline" onPress={cancelAllReminders} style={styles.gap} />
      </Card>

      {user ? (
        <PrimaryButton title="Выйти" variant="outline" onPress={logout} style={styles.gap} />
      ) : null}

      {msg ? <Text style={[styles.msg, { color: colors.textMuted }]}>{msg}</Text> : null}
    </AppScreen>
  );
}

function GenderChip({ label, selected, onPress, colors }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.genderChip,
        {
          borderColor: colors.border,
          backgroundColor: selected ? colors.chipSelectedBg : colors.surface2,
        },
      ]}
    >
      <Text style={{ color: selected ? colors.text : colors.textMuted, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  email: {
    fontSize: 15,
    marginBottom: 12,
    fontWeight: '600',
  },
  avatarWrap: {
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPh: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gap: {
    marginTop: 10,
  },
  msg: {
    marginTop: 12,
    fontSize: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  genderChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
