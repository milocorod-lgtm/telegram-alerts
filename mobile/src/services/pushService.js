import messaging from '@react-native-firebase/messaging';
import { registerDevice } from './telegramService';
import { triggerIncomingCall } from './alarmService';

export async function requestNotificationPermission() {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function initPush() {
  await requestNotificationPermission();
  const token = await messaging().getToken();
  await registerDevice(token);

  messaging().onTokenRefresh(async (newToken) => {
    await registerDevice(newToken);
  });

  return token;
}

export async function handleAlarmMessage(remoteMessage) {
  const data = (remoteMessage && remoteMessage.data) || {};
  if (data.type !== 'alarm_trigger') return;
  await triggerIncomingCall({
    chatName: data.chat_name,
    keyword: data.keyword,
    callText: data.call_text,
  });
}

export function onForegroundAlarm(callback) {
  return messaging().onMessage(async (remoteMessage) => {
    await handleAlarmMessage(remoteMessage);
    if (callback) callback(remoteMessage);
  });
}

// Se registra en index.js, ANTES de que la app monte React, para que
// funcione con la app cerrada o en segundo plano (celular bloqueado).
export function registerBackgroundHandler() {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    await handleAlarmMessage(remoteMessage);
  });
}
