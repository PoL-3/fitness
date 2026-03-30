import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiJson } from '@/constants/api';

const TOKEN_KEY = '@fitness/auth_token';
const AVATAR_KEY_PREFIX = '@fitness/avatar_uri:';

function avatarKeyFor(userId) {
  return `${AVATAR_KEY_PREFIX}${userId ?? 'anon'}`;
}

const AuthContext = createContext({
  token: null,
  user: null,
  avatarUri: null,
  ready: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshMe: async () => {},
  setAvatarUri: async () => {},
  updateProfileRemote: async () => {},
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [avatarUri, setAvatarUriState] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await AsyncStorage.getItem(TOKEN_KEY);
        if (cancelled) {
          return;
        }
        setToken(t);
        if (t) {
          const { res, data } = await apiJson('/auth/me', { token: t });
          if (res.ok && data.ok && data.user) {
            setUser(data.user);
            const av = await AsyncStorage.getItem(avatarKeyFor(data.user.id));
            if (!cancelled) {
              setAvatarUriState(av || null);
            }
          } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
            setToken(null);
          }
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

  const login = useCallback(async (email, password) => {
    const { res, data } = await apiJson('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Ошибка входа');
    }
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    const av = await AsyncStorage.getItem(avatarKeyFor(data.user.id));
    setAvatarUriState(av || null);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    const { res, data } = await apiJson('/auth/register', {
      method: 'POST',
      body: { email, password, displayName },
    });
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Ошибка регистрации');
    }
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    const av = await AsyncStorage.getItem(avatarKeyFor(data.user.id));
    setAvatarUriState(av || null);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setAvatarUriState(null);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) {
      return;
    }
    const { res, data } = await apiJson('/auth/me', { token });
    if (res.ok && data.ok) {
      setUser(data.user);
      const av = await AsyncStorage.getItem(avatarKeyFor(data.user.id));
      setAvatarUriState(av || null);
    }
  }, [token]);

  const setAvatarUri = useCallback(async (uri) => {
    setAvatarUriState(uri);
    const key = avatarKeyFor(user?.id);
    if (uri) {
      await AsyncStorage.setItem(key, uri);
      return;
    }
    await AsyncStorage.removeItem(key);
  }, [user?.id]);

  const updateProfileRemote = useCallback(
    async (payload) => {
      if (!token) {
        throw new Error('Войдите в аккаунт');
      }
      const { res, data } = await apiJson('/auth/profile', {
        method: 'PUT',
        token,
        body: payload,
      });
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Не удалось сохранить профиль');
      }
      setUser(data.user);
      return data.user;
    },
    [token],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      avatarUri,
      ready,
      login,
      register,
      logout,
      refreshMe,
      setAvatarUri,
      updateProfileRemote,
    }),
    [
      token,
      user,
      avatarUri,
      ready,
      login,
      register,
      logout,
      refreshMe,
      setAvatarUri,
      updateProfileRemote,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
