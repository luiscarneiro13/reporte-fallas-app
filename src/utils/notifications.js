import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Expo Go (Android, SDK 53+) no incluye push remoto: las APIs nativas fallan.
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

export function setCustomNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function equipmentIdFromUrl(url) {
  const match = String(url ?? '').match(/^(?:[a-z][a-z0-9+.-]*:\/\/[^/]*?\/?)?\/?equipment\/([^/?#]+)/i);
  return match ? match[1] : null;
}

// Las fallas cerradas se archivan (se eliminan de /fallas), por eso fault_closed
// cae al historial del equipo; fault_created abre el detalle de la falla.
export function getNotificationTarget(data) {
  if (!data) return null;
  if (data.type === 'fault_created' && data.fault_id) {
    return { name: 'FaultDetail', params: { faultId: String(data.fault_id) } };
  }
  const equipmentId = equipmentIdFromUrl(data.url);
  return equipmentId ? { name: 'EquipmentDetail', params: { equipmentId } } : null;
}

function handleRegistrationError(errorMessage) {
  console.warn('[notifications]', errorMessage);
  throw new Error(errorMessage);
}

export async function registerForPushNotificationsAsync() {
  if (isExpoGo) return undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF1E3A8A',
    });
  }

  if (!Device.isDevice) {
    handleRegistrationError('Must use physical device for push notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    handleRegistrationError('Permission not granted');
    return;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    handleRegistrationError('Project ID not found');
    return;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    handleRegistrationError(String(error));
  }
}
