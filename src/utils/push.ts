import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { apiFetch } from '../api/client';

// Must match the channelId the backend puts on every push (Android 8+ routes
// notifications by channel; an unknown channel falls back to a silent default).
export const ORDERS_CHANNEL_ID = 'orders';

// Show pushes as a banner with sound even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// The token this device registered with the backend, so logout can unregister it.
let registeredToken: string | null = null;

export function getRegisteredPushToken(): string | null {
  return registeredToken;
}

async function sendTokenToBackend(token: string) {
  await apiFetch('/notifications/register-device', { method: 'POST', body: { token, platform: 'android' } });
  registeredToken = token;
}

// Firebase can rotate a device's token while the app is running; keep the
// backend in step while someone is logged in (registeredToken is set).
Notifications.addPushTokenListener(({ data }) => {
  if (registeredToken && typeof data === 'string' && data !== registeredToken) {
    sendTokenToBackend(data).catch((e) => console.warn('Push token refresh failed', e));
  }
});

/**
 * Ask for notification permission, get this device's Firebase (FCM) token and
 * register it with the backend, which sends straight to FCM. Best-effort: never
 * throws, and quietly does nothing in Expo Go (no remote push since SDK 53), on
 * emulators, when the user declines permission, or on iOS (its native token is
 * an APNs token, which needs APNs set up in Firebase first — Phase 1.5).
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (Platform.OS !== 'android') return;
    if (!Device.isDevice || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

    await Notifications.setNotificationChannelAsync(ORDERS_CHANNEL_ID, {
      name: 'Order updates',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (typeof token === 'string' && token) await sendTokenToBackend(token);
  } catch (e) {
    console.warn('Push registration failed', e);
  }
}

export function forgetPushToken() {
  registeredToken = null;
}
