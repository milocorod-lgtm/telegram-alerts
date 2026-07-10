import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { fetchHistory } from '../services/telegramService';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchHistory();
      setHistory(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.chatName}>{item.chat_name}</Text>
            <Text style={styles.keyword}>Palabra: {item.keyword_matched}</Text>
            <Text style={styles.preview}>{item.message_preview}</Text>
            <Text style={styles.date}>{new Date(item.triggered_at).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aun no hay alertas disparadas</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  chatName: { fontSize: 16, fontWeight: 'bold' },
  keyword: { fontSize: 14, color: '#1976d2', marginTop: 2 },
  preview: { fontSize: 14, color: '#555', marginTop: 4 },
  date: { fontSize: 12, color: '#999', marginTop: 4 },
  empty: { padding: 24, textAlign: 'center', color: '#888' },
});
