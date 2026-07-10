import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import {
  getRingtonePreference,
  setRingtonePreference,
  getVibrationPreference,
  setVibrationPreference,
  pickRingtone,
  previewRingtone,
  stopPreview,
  answerCall,
  rejectCall,
  getActiveCallId,
} from '../services/alarmService';

export default function AlarmScreen({ route, navigation }) {
  const params = route.params || {};

  if (params.triggered) {
    return (
      <IncomingCallView chatName={params.chatName} keyword={params.keyword} navigation={navigation} />
    );
  }
  return <AlarmSettingsView />;
}

function IncomingCallView({ chatName, keyword, navigation }) {
  function handleAccept() {
    answerCall(getActiveCallId());
    navigation.navigate('Config');
  }

  function handleReject() {
    rejectCall(getActiveCallId());
    navigation.navigate('Config');
  }

  return (
    <View style={styles.callContainer}>
      <Text style={styles.callLabel}>Alerta de Telegram</Text>
      <Text style={styles.callChat}>{chatName || 'Chat desconocido'}</Text>
      <Text style={styles.callKeyword}>{keyword ? `Palabra: ${keyword}` : ''}</Text>

      <View style={styles.callButtonsRow}>
        <TouchableOpacity style={[styles.callButton, styles.rejectButton]} onPress={handleReject}>
          <Text style={styles.callButtonText}>✕</Text>
          <Text style={styles.callButtonLabel}>Rechazar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.callButton, styles.acceptButton]} onPress={handleAccept}>
          <Text style={styles.callButtonText}>✓</Text>
          <Text style={styles.callButtonLabel}>Aceptar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AlarmSettingsView() {
  const [ringtone, setRingtone] = useState(null);
  const [vibration, setVibration] = useState(true);

  useEffect(() => {
    (async () => {
      setRingtone(await getRingtonePreference());
      setVibration(await getVibrationPreference());
    })();
    return () => stopPreview();
  }, []);

  async function handlePick() {
    try {
      const result = await pickRingtone(ringtone && ringtone.uri);
      if (result) {
        setRingtone(result);
        await setRingtonePreference(result);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir el selector de tonos: ' + e.message);
    }
  }

  function handlePreview() {
    previewRingtone(ringtone && ringtone.uri);
  }

  async function handleVibrationToggle(value) {
    setVibration(value);
    await setVibrationPreference(value);
  }

  return (
    <View style={styles.settingsContainer}>
      <Text style={styles.label}>Tono de la alarma</Text>
      <Text style={styles.ringtoneName}>{(ringtone && ringtone.title) || 'Tono predeterminado'}</Text>

      <TouchableOpacity style={styles.button} onPress={handlePick}>
        <Text style={styles.buttonText}>Elegir tono</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handlePreview}>
        <Text style={styles.buttonText}>Escuchar preview</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={stopPreview}>
        <Text style={styles.buttonText}>Detener preview</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <Text style={styles.label}>Vibracion</Text>
        <Switch value={vibration} onValueChange={handleVibrationToggle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  settingsContainer: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  ringtoneName: { fontSize: 14, color: '#555', marginBottom: 12 },
  button: { backgroundColor: '#1976d2', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 10 },
  secondaryButton: { backgroundColor: '#555' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },

  callContainer: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 80,
  },
  callLabel: { color: '#aaa', fontSize: 16, marginTop: 40 },
  callChat: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 12 },
  callKeyword: { color: '#ddd', fontSize: 18, marginTop: 8 },
  callButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: 40 },
  callButton: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  acceptButton: { backgroundColor: '#2e7d32' },
  rejectButton: { backgroundColor: '#c62828' },
  callButtonText: { color: '#fff', fontSize: 28 },
  callButtonLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
});
