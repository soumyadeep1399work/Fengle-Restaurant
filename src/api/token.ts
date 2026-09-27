import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'fengle.auth.token';
const USER_KEY = 'fengle.auth.user';

// Read synchronously by the fetch client on every request; AsyncStorage is
// only touched at boot and on login/logout.
let memoryToken: string | null = null;

export function getToken(): string | null {
  return memoryToken;
}

export async function loadStoredSession<U>(): Promise<{ token: string; user: U | null } | null> {
  const [[, token], [, userJson]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  if (!token) return null;
  memoryToken = token;
  let user: U | null = null;
  try {
    user = userJson ? (JSON.parse(userJson) as U) : null;
  } catch {
    user = null;
  }
  return { token, user };
}

export async function saveSession(token: string, user: unknown): Promise<void> {
  memoryToken = token;
  await AsyncStorage.multiSet([[TOKEN_KEY, token], [USER_KEY, JSON.stringify(user)]]);
}

export async function clearSession(): Promise<void> {
  memoryToken = null;
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
