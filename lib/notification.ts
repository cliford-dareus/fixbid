import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import {Platform} from 'react-native';
import {supabase} from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function handleRegistrationError(errorMessage: string) {
  console.warn(errorMessage);
}

/**
 * Request permissions, create Android channels, return Expo push token.
 * Does not write to Supabase — call registerPushTokenForUser after login.
 */
export async function setupNotifications(): Promise<string | undefined> {
  let token: string | undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('quotes', {
      name: 'Quotes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return token;
  }

  const {status: existingStatus} = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const {status} = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    handleRegistrationError('Notification permission not granted');
    return token;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const push = await Notifications.getExpoPushTokenAsync(
      projectId ? {projectId} : undefined,
    );
    token = push.data;
    console.log('Expo push token', token);
  } catch (e) {
    console.warn('Expo push token unavailable', e);
  }

  return token;
}

/** Persist token on profiles so edge functions can push offline. */
export async function registerPushTokenForUser(userId: string): Promise<string | null> {
  try {
    const token = await setupNotifications();
    if (!token || !userId) return null;

    const {error} = await supabase
      .from('profiles')
      .upsert(
        {id: userId, expo_push_token: token},
        {onConflict: 'id'},
      );

    if (error) {
      // Column may not exist until migration runs
      console.warn('Failed to save expo_push_token', error.message);
      return token;
    }

    return token;
  } catch (e) {
    console.warn('registerPushTokenForUser', e);
    return null;
  }
}

export async function clearPushTokenForUser(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await supabase
      .from('profiles')
      .update({expo_push_token: null})
      .eq('id', userId);
  } catch (e) {
    console.warn('clearPushTokenForUser', e);
  }
}

/** Immediate local notification (works while app is foreground/background). */
export async function notifyLocal(
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: data ?? {},
        ...(Platform.OS === 'android' ? {channelId: 'quotes'} : {}),
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('notifyLocal failed', e);
  }
}

export async function sendTestNotification() {
  await notifyLocal('FixBid', 'Test notification — client just paid a deposit!');
}
