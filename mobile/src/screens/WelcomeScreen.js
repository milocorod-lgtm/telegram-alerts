import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function WelcomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>TelegramAlarm</Text>
      <Text style={styles.subtitle}>
        Convierte los mensajes importantes de Telegram en una alarma que suena en tu
        celular.
      </Text>

      <Text style={styles.sectionTitle}>Cómo funciona</Text>

      <View style={styles.step}>
        <Text style={styles.stepNum}>1</Text>
        <Text style={styles.stepText}>
          En la pestaña <Text style={styles.bold}>Configurar</Text> eliges un canal y
          las palabras clave que quieres vigilar (ej: "XAUUSD SELL").
        </Text>
      </View>
      <View style={styles.step}>
        <Text style={styles.stepNum}>2</Text>
        <Text style={styles.stepText}>
          Puedes agregar <Text style={styles.bold}>varios canales</Text>, cada uno con
          sus propias palabras y su propio texto de alerta.
        </Text>
      </View>
      <View style={styles.step}>
        <Text style={styles.stepNum}>3</Text>
        <Text style={styles.stepText}>
          Cuando llegue un mensaje con esas palabras, tu celular{' '}
          <Text style={styles.bold}>suena y te muestra una alerta</Text> con el texto.
        </Text>
      </View>
      <View style={styles.step}>
        <Text style={styles.stepNum}>4</Text>
        <Text style={styles.stepText}>
          En la pestaña <Text style={styles.bold}>Estado</Text> ves todo lo que tienes
          configurado y el historial de alertas.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Configurar')}>
        <Text style={styles.buttonText}>Configurar mi primer canal</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Consejo: para que las alarmas lleguen con la pantalla bloqueada, deja la app en
        "Batería: Sin restricciones" y activa "Notificaciones de pantalla completa" en
        los ajustes de Android.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1976d2', marginTop: 12 },
  subtitle: { fontSize: 15, color: '#444', marginTop: 8, lineHeight: 21 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1976d2',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: 'bold',
    marginRight: 12,
  },
  stepText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 21 },
  bold: { fontWeight: '700', color: '#111' },
  button: { backgroundColor: '#2e7d32', borderRadius: 8, padding: 16, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  note: { fontSize: 13, color: '#888', marginTop: 20, lineHeight: 19 },
});
