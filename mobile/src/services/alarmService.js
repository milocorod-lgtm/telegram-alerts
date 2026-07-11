import { NativeModules, Vibration, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNCallKeep from 'react-native-callkeep';

const { RingtonePickerModule } = NativeModules;

const RINGTONE_KEY = '@telegramalarm/ringtone';
const VIBRATION_KEY = '@telegramalarm/vibration';

// NO usamos selfManaged: queremos que CallKeep muestre la pantalla de llamada
// NATIVA del sistema (via ConnectionService), que Android ya sabe mostrar sobre
// la pantalla de bloqueo. Requiere habilitar una vez la "cuenta de llamadas".
const callKeepOptions = {
  android: {
    alertTitle: 'Permiso necesario',
    alertDescription:
      'TelegramAlarm necesita este permiso para mostrar la alarma como una llamada entrante',
    cancelButton: 'Cancelar',
    okButton: 'Aceptar',
    imageName: 'ic_launcher',
    additionalPermissions: [],
    foregroundService: {
      channelId: 'com.milocorod.telegramalarm.call',
      channelName: 'Alarma TelegramAlarm',
      notificationTitle: 'TelegramAlarm esta activo',
    },
  },
};

let isSetup = false;
let activeCallId = null;
let autoStopTimer = null;

// Segundos tras los cuales la alarma se apaga sola si nadie la contesta
// (evita que quede sonando para siempre si la pantalla de llamada no aparece).
const AUTO_STOP_SECONDS = 45;

export async function setupCallKeep() {
  if (isSetup) return;
  try {
    await RNCallKeep.setup(callKeepOptions);
    if (typeof RNCallKeep.setAvailable === 'function') {
      RNCallKeep.setAvailable(true);
    }
    if (Platform.OS === 'android') {
      // Registra la cuenta de llamadas en el sistema (necesario para que la
      // pantalla de llamada nativa aparezca) y engancha los eventos de Android.
      if (typeof RNCallKeep.registerPhoneAccount === 'function') {
        RNCallKeep.registerPhoneAccount(callKeepOptions);
      }
      if (typeof RNCallKeep.registerAndroidEvents === 'function') {
        RNCallKeep.registerAndroidEvents();
      }
    }
    isSetup = true;
  } catch (e) {
    // Nunca dejar que un fallo de CallKeep tumbe la app al arrancar.
    isSetup = false;
  }
}

// Abre los ajustes del sistema donde el usuario habilita la cuenta de llamadas
// de TelegramAlarm (paso obligatorio una sola vez en Android).
export function openPhoneAccountSettings() {
  try {
    if (Platform.OS === 'android' && typeof RNCallKeep.openPhoneAccounts === 'function') {
      RNCallKeep.openPhoneAccounts();
    }
  } catch (e) {
    // no-op
  }
}

export function addCallKeepListeners({ onAnswer, onEnd }) {
  RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
    stopAlarmSound();
    if (onAnswer) onAnswer(callUUID);
  });
  RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
    stopAlarmSound();
    if (onEnd) onEnd(callUUID);
  });
}

export async function getRingtonePreference() {
  const raw = await AsyncStorage.getItem(RINGTONE_KEY);
  return raw ? JSON.parse(raw) : null; // { uri, title }
}

export async function setRingtonePreference(ringtone) {
  await AsyncStorage.setItem(RINGTONE_KEY, JSON.stringify(ringtone));
}

export async function getVibrationPreference() {
  const raw = await AsyncStorage.getItem(VIBRATION_KEY);
  return raw === null ? true : raw === 'true';
}

export async function setVibrationPreference(enabled) {
  await AsyncStorage.setItem(VIBRATION_KEY, enabled ? 'true' : 'false');
}

function ensureNativeModule() {
  if (!RingtonePickerModule) {
    throw new Error(
      'El modulo nativo de tonos no esta disponible. Reinstala la ultima version del APK.'
    );
  }
  return RingtonePickerModule;
}

export function pickRingtone(currentUri) {
  return ensureNativeModule().pickRingtone(currentUri || '');
}

export function previewRingtone(uri) {
  try {
    ensureNativeModule().playRingtone(uri || '');
  } catch (e) {
    // No tumbar la app si el modulo no esta; el llamador muestra el aviso.
    throw e;
  }
}

export function stopPreview() {
  if (RingtonePickerModule) RingtonePickerModule.stopRingtone();
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function triggerIncomingCall({ chatName, keyword, callText }) {
  await setupCallKeep();

  // Cierra cualquier "llamada" anterior que no se haya terminado bien; si no,
  // Android puede rechazar la nueva y no mostrar la pantalla (pasaba la 2a vez).
  try {
    RNCallKeep.endAllCalls();
  } catch (e) {
    // no-op
  }

  const id = uuid();
  activeCallId = id;
  // Etiqueta que se ve en la pantalla de llamada: si el usuario definio un
  // texto personalizado, se usa ese; si no, cae al chat + palabra clave.
  const label = callText || (keyword ? `${chatName} - ${keyword}` : chatName);
  RNCallKeep.displayIncomingCall(id, label, label, 'generic', false);

  const ringtone = await getRingtonePreference();
  if (RingtonePickerModule) {
    RingtonePickerModule.playRingtone(ringtone ? ringtone.uri : '');
  }

  const vibrationOn = await getVibrationPreference();
  if (vibrationOn) {
    Vibration.vibrate([500, 1000, 500, 1000], true);
  }

  // Auto-apagado: si nadie contesta en AUTO_STOP_SECONDS, callar todo solo.
  if (autoStopTimer) clearTimeout(autoStopTimer);
  autoStopTimer = setTimeout(() => {
    stopAlarmSound();
    try {
      RNCallKeep.endAllCalls();
    } catch (e) {
      // no-op
    }
    activeCallId = null;
  }, AUTO_STOP_SECONDS * 1000);

  return id;
}

export function stopAlarmSound() {
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }
  if (RingtonePickerModule) RingtonePickerModule.stopRingtone();
  Vibration.cancel();
}

export function answerCall(id = activeCallId) {
  if (!id) return;
  stopAlarmSound();
  RNCallKeep.answerIncomingCall(id);
  RNCallKeep.endCall(id);
  activeCallId = null;
}

export function rejectCall(id = activeCallId) {
  if (!id) return;
  stopAlarmSound();
  RNCallKeep.rejectCall(id);
  activeCallId = null;
}

export function getActiveCallId() {
  return activeCallId;
}
