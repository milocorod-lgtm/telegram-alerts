import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { stopAlarmSound } from '../services/alarmService';
import { clearAlarmNotification } from '../services/fullScreenAlarm';
import theme from '../theme';

export default function AlarmScreen({ route, navigation }) {
  const params = route.params || {};
  const { chatName, keyword, callText } = params;

  function dismiss() {
    stopAlarmSound();
    clearAlarmNotification();
    navigation.navigate('Main');
  }

  return (
    <LinearGradient colors={theme.gradAlarm} style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.top}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>◆ ALERTA DE TELEGRAM</Text>
        </View>
        <Text style={styles.chat}>{callText || chatName || 'Chat desconocido'}</Text>
        {keyword ? <Text style={styles.keyword}>{keyword}</Text> : null}
      </View>

      <View style={styles.pulseWrap}>
        <View style={styles.pulseOuter}>
          <View style={styles.pulseInner}>
            <Text style={styles.pulseIcon}>🔔</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonsRow}>
        <View style={styles.btnCol}>
          <TouchableOpacity style={[styles.btn, styles.reject]} onPress={dismiss} activeOpacity={0.85}>
            <Text style={styles.btnIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.btnLabel}>Rechazar</Text>
        </View>
        <View style={styles.btnCol}>
          <TouchableOpacity onPress={dismiss} activeOpacity={0.85}>
            <LinearGradient colors={['#2DD4A7', '#22D3EE']} style={styles.btn}>
              <Text style={[styles.btnIcon, { color: '#04121F' }]}>✓</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.btnLabel}>Aceptar</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 72 },
  top: { alignItems: 'center', marginTop: 30, paddingHorizontal: 24 },
  pill: {
    borderWidth: 1, borderColor: 'rgba(230, 200, 120, 0.4)', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14, marginBottom: 22,
  },
  pillText: { color: theme.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  chat: { color: theme.text, fontSize: 30, fontWeight: '800', textAlign: 'center', lineHeight: 38 },
  keyword: { color: theme.cyan, fontSize: 17, marginTop: 12, fontWeight: '600' },
  pulseWrap: { alignItems: 'center', justifyContent: 'center' },
  pulseOuter: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(34, 211, 238, 0.06)',
    borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.18)', justifyContent: 'center', alignItems: 'center',
  },
  pulseInner: {
    width: 108, height: 108, borderRadius: 54, backgroundColor: 'rgba(34, 211, 238, 0.10)',
    borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.3)', justifyContent: 'center', alignItems: 'center',
  },
  pulseIcon: { fontSize: 44 },
  buttonsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: 40 },
  btnCol: { alignItems: 'center' },
  btn: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center' },
  reject: { backgroundColor: theme.danger },
  btnIcon: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  btnLabel: { color: theme.textDim, fontSize: 13, marginTop: 10 },
});
