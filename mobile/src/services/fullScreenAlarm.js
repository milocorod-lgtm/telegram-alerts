import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHANNEL_ID = 'alarm-fullscreen';
export const PENDING_ALARM_KEY = '@telegramalarm/pendingAlarm';

// Crea (o asegura) el canal de alto nivel: suena/aparece incluso bloqueado.
export async function ensureAlarmChannel() {
  return notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Alarmas TelegramAlarm',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    bypassDnd: true,
  });
}

// Construye la etiqueta que se ve: texto personalizado si existe, si no chat+palabra.
function buildLabel({ chatName, keyword, callText }) {
  if (callText) return callText;
  if (keyword) return `${chatName || ''} - ${keyword}`.trim();
  return chatName || 'Alerta de Telegram';
}

// Muestra la notificacion de PANTALLA COMPLETA que abre la app sobre el bloqueo.
export async function displayFullScreenAlarm({ chatName, keyword, callText }) {
  await ensureAlarmChannel();
  const label = buildLabel({ chatName, keyword, callText });

  // Guardamos los datos para que la app, al abrirse por el intent, sepa que
  // debe mostrar la pantalla de llamada.
  await AsyncStorage.setItem(
    PENDING_ALARM_KEY,
    JSON.stringify({ chatName: chatName || '', keyword: keyword || '', callText: callText || '', ts: Date.now() })
  );

  await notifee.displayNotification({
    id: 'alarm',
    title: label,
    body: 'Alerta de Telegram — toca para abrir',
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      category: AndroidCategory.CALL,
      visibility: AndroidVisibility.PUBLIC,
      // Intento de pantalla completa (bonus cuando el sistema lo permite).
      fullScreenAction: { id: 'default', launchActivity: 'default' },
      // Al tocar la notificacion se abre la app (pantalla de llamada).
      pressAction: { id: 'default', launchActivity: 'default' },
      // NO 'ongoing': asi baja como alerta desplegable visible en el bloqueo.
      autoCancel: true,
      actions: [
        { title: 'Abrir', pressAction: { id: 'default', launchActivity: 'default' } },
        { title: 'Descartar', pressAction: { id: 'reject' } },
      ],
    },
  });
}

export async function clearAlarmNotification() {
  try {
    await notifee.cancelNotification('alarm');
  } catch (e) {
    // no-op
  }
  try {
    await AsyncStorage.removeItem(PENDING_ALARM_KEY);
  } catch (e) {
    // no-op
  }
}

// Lee (y no borra) una alarma pendiente reciente; la usa la app al abrir.
export async function getPendingAlarm() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_ALARM_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Solo valida si es reciente (2 minutos), para no revivir alarmas viejas.
    if (Date.now() - (data.ts || 0) > 120000) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// Pide (si hace falta) el permiso de "notificaciones de pantalla completa" que
// Android 14 exige para apps que no son de telefono.
export async function ensureFullScreenPermission() {
  try {
    await notifee.requestPermission();
  } catch (e) {
    // no-op
  }
}
