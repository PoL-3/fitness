import Constants from 'expo-constants';

export function getApiBaseUrl() {
  const configured = Constants.expoConfig?.extra?.apiBaseUrl;
  if (typeof configured === 'string' && configured.length) {
    // On a physical device "localhost" points to the phone, not the dev machine.
    // If a user left localhost in config, try to derive the dev machine IP from Expo hostUri.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured)) {
      const hostUri = Constants.expoConfig?.hostUri;
      if (typeof hostUri === 'string' && hostUri.length) {
        const host = hostUri.split(':')[0]; // e.g. "192.168.1.10:8081" -> "192.168.1.10"
        return `http://${host}:3000`;
      }
    }
    return configured;
  }
  return 'http://localhost:3000';
}

export async function apiJson(path, options = {}) {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const { token, method = 'GET', body } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}
