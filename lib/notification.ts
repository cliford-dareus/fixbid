import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {Platform} from 'react-native';

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

export async function setupNotifications() {
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
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } catch (e) {
    console.warn('Expo push token unavailable', e);
  }

  return token;
}

/** Immediate local notification (works while app is foreground/background). */
export async function notifyLocal(title: string, body: string, data?: Record<string, unknown>) {
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
