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

export async function setupCallKeep() {
  if (isSetup) return;
  await RNCallKeep.setup(callKeepOptions);
  RNCallKeep.setAvailable(true);
  if (Platform.OS === 'android') {
    // Registra la cuenta de llamadas en el sistema (necesario para que la
    // pantalla de llamada nativa aparezca) y engancha los eventos de Android.
    RNCallKeep.registerPhoneAccount(callKeepOptions);
    RNCallKeep.registerAndroidEvents();
  }
  isSetup = true;
}

// Abre los ajustes del sistema donde el usuario habilita la cuenta de llamadas
// de TelegramAlarm (paso obligatorio una sola vez en Android).
export function openPhoneAccountSettings() {
  if (Platform.OS === 'android') {
    RNCallKeep.openPhoneAccounts();
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

export async function triggerIncomingCall({ chatName, keyword }) {
  await setupCallKeep();
  const id = uuid();
  activeCallId = id;
  const label = keyword ? `${chatName} - ${keyword}` : chatName;
  RNCallKeep.displayIncomingCall(id, label, label, 'generic', false);

  const ringtone = await getRingtonePreference();
  if (RingtonePickerModule) {
    RingtonePickerModule.playRingtone(ringtone ? ringtone.uri : '');
  }

  const vibrationOn = await getVibrationPreference();
  if (vibrationOn) {
    Vibration.vibrate([500, 1000, 500, 1000], true);
  }

  return id;
}

export function stopAlarmSound() {
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
