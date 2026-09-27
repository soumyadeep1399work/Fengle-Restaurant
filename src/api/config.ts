import Constants from 'expo-constants';

// In development the backend runs on the same machine as Metro, so reuse the
// host Expo Go loaded the bundle from: the PC's LAN IP over Wi-Fi, or
// 127.0.0.1 over USB (with `adb reverse tcp:4000 tcp:4000`). Set
// EXPO_PUBLIC_API_URL to override (e.g. an emulator or the hosted API).
const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${metroHost ?? 'localhost'}:4000/api/v1`;
