import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { fetchRules, deleteRule, resetAll, fetchHistory } from '../services/telegramService';
import theme from '../theme';

export default function StatusScreen({ navigation }) {
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, h] = await Promise.all([fetchRules(), fetchHistory()]);
      setRules(r);
      setHistory(h);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function confirmDeleteRule(rule) {
    Alert.alert('Quitar canal', `¿Quitar "${rule.chat_name}" de la vigilancia?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRule(rule.id);
            load();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  function confirmReset() {
    Alert.alert('Borrar todo', 'Se borrarán TODOS los canales y el historial. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar todo',
        style: 'destructive',
        onPress: async () => {
          try {
            await resetAll();
            load();
            Alert.alert('Listo', 'Todo borrado. Empieza de nuevo en "Configurar".');
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return iso;
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.cyan} />
        }
      >
        <Text style={styles.h1}>Estado</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{rules.length}</Text>
            <Text style={styles.statLabel}>CANALES ACTIVOS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: theme.gold }]}>{history.length}</Text>
            <Text style={styles.statLabel}>ALERTAS</Text>
          </View>
        </View>

        <Text style={styles.section}>CANALES VIGILADOS</Text>
        {loading && rules.length === 0 ? (
          <ActivityIndicator style={{ marginVertical: 20 }} color={theme.cyan} />
        ) : rules.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>Aún no has configurado ningún canal.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Configurar')} activeOpacity={0.85}>
              <LinearGradient colors={theme.gradPrimary} style={styles.linkBtn}>
                <Text style={styles.linkBtnText}>Ir a Configurar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          rules.map((rule) => (
            <View key={rule.id} style={styles.card}>
              <View style={styles.cardAccent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{rule.chat_name}</Text>
                <Text style={styles.cardLine}>
                  {rule.mode === 'all'
                    ? 'Todo el chat'
                    : `Palabras: ${rule.keywords.join(', ')}`}
                </Text>
                {rule.call_text ? (
                  <Text style={styles.cardAlert}>◆ "{rule.call_text}"</Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.delBtn} onPress={() => confirmDeleteRule(rule)}>
                <Text style={styles.delBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={styles.section}>HISTORIAL DE ALERTAS</Text>
        {history.length === 0 ? (
          <Text style={styles.empty}>Todavía no hay alertas registradas.</Text>
        ) : (
          history.map((h) => (
            <View key={h.id} style={styles.histItem}>
              <View style={styles.histDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.histKw}>{h.keyword_matched}</Text>
                <Text style={styles.histMeta}>
                  {h.chat_name} · {fmtDate(h.triggered_at)}
                </Text>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.resetBtn} onPress={confirmReset} activeOpacity={0.8}>
          <Text style={styles.resetBtnText}>Borrar todo y empezar de nuevo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  h1: { color: theme.text, fontSize: 26, fontWeight: '800', marginTop: 8, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 16, padding: 18,
  },
  statNum: { color: theme.cyan, fontSize: 30, fontWeight: '900' },
  statLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 4 },
  section: { color: theme.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginTop: 26, marginBottom: 12 },
  emptyBox: { alignItems: 'flex-start' },
  empty: { color: theme.textMuted, marginBottom: 12 },
  linkBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  linkBtnText: { color: '#04121F', fontWeight: '800' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 16, padding: 16, marginBottom: 12, overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: theme.cyan,
  },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 5, marginLeft: 6 },
  cardLine: { color: theme.textDim, fontSize: 14, marginTop: 2, marginLeft: 6 },
  cardAlert: { color: theme.gold, fontSize: 13, marginTop: 6, marginLeft: 6 },
  delBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(240, 87, 78, 0.12)',
    borderWidth: 1, borderColor: 'rgba(240, 87, 78, 0.3)', justifyContent: 'center', alignItems: 'center', marginLeft: 10,
  },
  delBtnText: { color: theme.danger, fontSize: 15, fontWeight: 'bold' },
  histItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  histDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.gold, marginRight: 12 },
  histKw: { color: theme.text, fontSize: 15, fontWeight: '600' },
  histMeta: { color: theme.textMuted, fontSize: 12, marginTop: 3 },
  resetBtn: {
    borderWidth: 1, borderColor: 'rgba(240, 87, 78, 0.4)', backgroundColor: 'rgba(240, 87, 78, 0.06)',
    borderRadius: 14, padding: 16, marginTop: 32, alignItems: 'center',
  },
  resetBtnText: { color: theme.danger, fontWeight: '700', fontSize: 15 },
});
