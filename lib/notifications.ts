import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  console.error('Error setting notification handler:', error);
}

export async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === 'web') {
      return null;
    }

    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch (err) {
        console.error('Error setting notification channel:', err);
      }
    }

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.log('Push notification registration timed out');
        resolve(null);
      }, 3000);
    });

    const registrationPromise = (async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    })();

    const token = await Promise.race([registrationPromise, timeoutPromise]);

    return token;
  } catch (error) {
    console.error('Error in registerForPushNotificationsAsync:', error);
    return null;
  }
}

export async function savePushToken(userId: string, expoPushToken: string) {
  try {
    const deviceId = Device.modelName || 'unknown';

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          device_id: deviceId,
        },
        {
          onConflict: 'user_id,expo_push_token',
        }
      );

    if (error) throw error;
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

export async function removePushToken(userId: string, expoPushToken: string) {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('expo_push_token', expoPushToken);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}
