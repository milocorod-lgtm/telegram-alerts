import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import theme from '../theme';

const STEPS = [
  {
    n: '1',
    t: 'Elige tus canales',
    d: 'En Configurar seleccionas un canal y las palabras clave a vigilar (ej: "XAUUSD SELL").',
  },
  {
    n: '2',
    t: 'Varios a la vez',
    d: 'Agrega múltiples canales, cada uno con sus propias palabras y su texto de alerta.',
  },
  {
    n: '3',
    t: 'Suena y avisa',
    d: 'Cuando llega un mensaje con esas palabras, tu celular suena y te muestra la alerta.',
  },
  {
    n: '4',
    t: 'Todo bajo control',
    d: 'En Estado ves lo que tienes activo y el historial completo de alertas.',
  },
];

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={theme.gradHero} style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>◆ SEÑALES EN TIEMPO REAL</Text>
          </View>
          <Text style={styles.brand}>TelegramAlarm</Text>
          <Text style={styles.tagline}>
            Convierte los mensajes clave de Telegram en una alarma imposible de ignorar.
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>CÓMO FUNCIONA</Text>

          {STEPS.map((s) => (
            <View key={s.n} style={styles.card}>
              <LinearGradient colors={theme.gradPrimary} style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.n}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.t}</Text>
                <Text style={styles.stepDesc}>{s.d}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Configurar')}>
            <LinearGradient
              colors={theme.gradPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Configurar mi primer canal</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>◆ Para que suene bloqueado</Text>
            <Text style={styles.tipText}>
              Deja la app en Batería “Sin restricciones” y activa “Notificaciones de pantalla
              completa” en los ajustes de Android.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  hero: { paddingTop: 56, paddingBottom: 34, paddingHorizontal: 24 },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  badgeText: { color: theme.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  brand: { color: theme.text, fontSize: 34, fontWeight: '800', letterSpacing: 0.5 },
  tagline: { color: theme.textDim, fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 320 },
  body: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  stepNum: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stepNumText: { color: '#04121F', fontWeight: '900', fontSize: 16 },
  stepTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 3 },
  stepDesc: { color: theme.textDim, fontSize: 14, lineHeight: 20 },
  cta: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  ctaText: { color: '#04121F', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  tipBox: {
    backgroundColor: 'rgba(230, 200, 120, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(230, 200, 120, 0.22)',
    borderRadius: 14,
    padding: 16,
    marginTop: 22,
  },
  tipTitle: { color: theme.gold, fontWeight: '700', fontSize: 13, marginBottom: 6, letterSpacing: 0.5 },
  tipText: { color: theme.textDim, fontSize: 13, lineHeight: 19 },
});
