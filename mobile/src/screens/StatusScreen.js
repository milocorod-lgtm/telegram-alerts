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
import { useFocusEffect } from '@react-navigation/native';
import { fetchRules, deleteRule, resetAll, fetchHistory } from '../services/telegramService';

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

  // Recarga cada vez que se entra a la pestaña.
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
    Alert.alert(
      'Borrar todo',
      'Se borrarán TODOS los canales configurados y el historial. ¿Continuar?',
      [
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
      ]
    );
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch (e) {
      return iso;
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.sectionTitle}>Canales vigilados ({rules.length})</Text>

      {loading && rules.length === 0 ? (
        <ActivityIndicator style={{ marginVertical: 20 }} />
      ) : rules.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.empty}>Aún no has configurado ningún canal.</Text>
          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Configurar')}>
            <Text style={styles.linkButtonText}>Ir a Configurar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        rules.map((rule) => (
          <View key={rule.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{rule.chat_name}</Text>
              <Text style={styles.cardLine}>
                {rule.mode === 'all' ? 'Todo el chat' : `Palabras: ${rule.keywords.join(', ')}`}
              </Text>
              {rule.call_text ? (
                <Text style={styles.cardLine}>Alerta: "{rule.call_text}"</Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDeleteRule(rule)}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Historial de alertas</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>Todavía no hay alertas registradas.</Text>
      ) : (
        history.map((h) => (
          <View key={h.id} style={styles.historyItem}>
            <Text style={styles.historyKw}>{h.keyword_matched}</Text>
            <Text style={styles.historyMeta}>
              {h.chat_name} · {fmtDate(h.triggered_at)}
            </Text>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.resetButton} onPress={confirmReset}>
        <Text style={styles.resetButtonText}>Borrar todo y empezar de nuevo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 10 },
  emptyBox: { alignItems: 'flex-start' },
  empty: { color: '#888', marginBottom: 10 },
  linkButton: { backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  linkButtonText: { color: '#fff', fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardLine: { fontSize: 14, color: '#555', marginTop: 2 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fdecea',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteBtnText: { color: '#c62828', fontSize: 16, fontWeight: 'bold' },
  historyItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  historyKw: { fontSize: 15, fontWeight: '600' },
  historyMeta: { fontSize: 13, color: '#888', marginTop: 2 },
  resetButton: {
    backgroundColor: '#c62828',
    borderRadius: 8,
    padding: 14,
    marginTop: 28,
    alignItems: 'center',
  },
  resetButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
