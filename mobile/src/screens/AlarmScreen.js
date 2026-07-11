import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { stopAlarmSound } from '../services/alarmService';
import { clearAlarmNotification } from '../services/fullScreenAlarm';

// Pantalla de "llamada entrante" que se muestra cuando llega una alerta.
export default function AlarmScreen({ route, navigation }) {
  const params = route.params || {};
  const { chatName, keyword, callText } = params;

  function dismiss() {
    stopAlarmSound();
    clearAlarmNotification();
    navigation.navigate('Main');
  }

  return (
    <View style={styles.callContainer}>
      <Text style={styles.callLabel}>Alerta de Telegram</Text>
      <Text style={styles.callChat}>{callText || chatName || 'Chat desconocido'}</Text>
      <Text style={styles.callKeyword}>{keyword ? `Palabra: ${keyword}` : ''}</Text>

      <View style={styles.callButtonsRow}>
        <TouchableOpacity style={[styles.callButton, styles.rejectButton]} onPress={dismiss}>
          <Text style={styles.callButtonText}>✕</Text>
          <Text style={styles.callButtonLabel}>Rechazar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.callButton, styles.acceptButton]} onPress={dismiss}>
          <Text style={styles.callButtonText}>✓</Text>
          <Text style={styles.callButtonLabel}>Aceptar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  callContainer: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 80,
  },
  callLabel: { color: '#aaa', fontSize: 16, marginTop: 40 },
  callChat: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 12, textAlign: 'center', paddingHorizontal: 20 },
  callKeyword: { color: '#ddd', fontSize: 18, marginTop: 8 },
  callButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: 40 },
  callButton: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  acceptButton: { backgroundColor: '#2e7d32' },
  rejectButton: { backgroundColor: '#c62828' },
  callButtonText: { color: '#fff', fontSize: 28 },
  callButtonLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
});
