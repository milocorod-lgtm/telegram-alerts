import { NativeModules, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { RingtonePickerModule } = NativeModules;

const RINGTONE_KEY = '@telegramalarm/ringtone';
const VIBRATION_KEY = '@telegramalarm/vibration';

let autoStopTimer = null;

// Segundos tras los cuales la alarma se apaga sola si nadie la contesta
// (evita que quede sonando para siempre).
const AUTO_STOP_SECONDS = 45;

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
  ensureNativeModule().playRingtone(uri || '');
}

export function stopPreview() {
  if (RingtonePickerModule) RingtonePickerModule.stopRingtone();
}

// Reproduce el tono elegido + vibra, y programa el auto-apagado. NO depende de
// CallKeep: la pantalla de llamada la dibuja Notifee (fullScreenAlarm.js).
export async function playAlarmSound() {
  const ringtone = await getRingtonePreference();
  if (RingtonePickerModule) {
    RingtonePickerModule.playRingtone(ringtone ? ringtone.uri : '');
  }

  const vibrationOn = await getVibrationPreference();
  if (vibrationOn) {
    Vibration.vibrate([500, 1000, 500, 1000], true);
  }

  if (autoStopTimer) clearTimeout(autoStopTimer);
  autoStopTimer = setTimeout(() => {
    stopAlarmSound();
  }, AUTO_STOP_SECONDS * 1000);
}

export function stopAlarmSound() {
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }
  if (RingtonePickerModule) RingtonePickerModule.stopRingtone();
  Vibration.cancel();
}
