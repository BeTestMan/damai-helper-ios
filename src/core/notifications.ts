import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** 前台也把提醒横幅弹出来，否则 App 开着时反而看不到。 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function iosAuthorized(status: Notifications.IosAuthorizationStatus | undefined): boolean {
  return (
    status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('grab', {
      name: '抢票提醒',
      importance: Notifications.AndroidImportance.MAX,
    }).catch(() => {});
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || iosAuthorized(current.ios?.status)) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted || iosAuthorized(asked.ios?.status);
}

export async function scheduleGrabNotification(params: {
  fireAtDeviceMs: number;
  title: string;
  body: string;
  deepLink: string;
}): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: { deepLink: params.deepLink },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(params.fireAtDeviceMs),
    },
  });
}

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduledCount(): Promise<number> {
  const list = await Notifications.getAllScheduledNotificationsAsync();
  return list.length;
}