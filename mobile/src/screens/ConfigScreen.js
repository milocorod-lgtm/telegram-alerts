import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { fetchChats, fetchConfig, saveConfig } from '../services/telegramService';

export default function ConfigScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [mode, setMode] = useState('keywords'); // 'all' | 'keywords'
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [callText, setCallText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [chatList, config] = await Promise.all([fetchChats(), fetchConfig()]);
      setChats(chatList);
      if (config.chat_id) {
        setSelectedChat({ chat_id: config.chat_id, name: config.chat_name });
      }
      setMode(config.mode || 'keywords');
      setKeywords(config.keywords || []);
      setCallText(config.call_text || '');
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar con el backend: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function addKeyword() {
    const value = keywordInput.trim();
    if (!value) return;
    if (!keywords.includes(value)) {
      setKeywords([...keywords, value]);
    }
    setKeywordInput('');
  }

  function removeKeyword(word) {
    setKeywords(keywords.filter((k) => k !== word));
  }

  async function handleSave() {
    if (!selectedChat) {
      Alert.alert('Falta el chat', 'Elige el chat o canal a monitorear');
      return;
    }
    setSaving(true);
    try {
      await saveConfig({
        chatId: selectedChat.chat_id,
        chatName: selectedChat.name,
        mode,
        keywords,
        callText,
      });
      Alert.alert('Guardado', 'La configuracion se guardo correctamente');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Chat / canal a monitorear</Text>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.chat_id}
        style={styles.chatList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.chatItem,
              selectedChat && selectedChat.chat_id === item.chat_id && styles.chatItemSelected,
            ]}
            onPress={() => setSelectedChat(item)}
          >
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No se encontraron chats. Revisa que el backend este conectado.</Text>
        }
      />

      <View style={styles.row}>
        <Text style={styles.label}>Todo el chat</Text>
        <Switch value={mode === 'all'} onValueChange={(v) => setMode(v ? 'all' : 'keywords')} />
      </View>

      {mode === 'keywords' && (
        <View>
          <Text style={styles.label}>Palabras clave</Text>
          <Text style={styles.hint}>
            Sé muy específico: escribe la frase EXACTA que dispara la alarma
            (ej: "XAUUSD SELL"), no una palabra suelta como "XAUUSD" que
            aparece en cualquier comentario. Los espacios de más o los saltos
            de línea se ignoran, pero el orden de las palabras sí importa.
          </Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={keywordInput}
              onChangeText={setKeywordInput}
              placeholder='ej: XAUUSD SELL'
              onSubmitEditing={addKeyword}
            />
            <TouchableOpacity style={styles.addButton} onPress={addKeyword}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chips}>
            {keywords.map((word) => (
              <TouchableOpacity key={word} style={styles.chip} onPress={() => removeKeyword(word)}>
                <Text style={styles.chipText}>{word} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.label}>Texto que aparece en la llamada</Text>
      <Text style={styles.hint}>
        Lo que veras en la pantalla de la alarma cuando se dispare (ej: "A
        trabajar Senal de Trading"). Si lo dejas vacio, se muestra el chat y la
        palabra detectada.
      </Text>
      <TextInput
        style={styles.callTextInput}
        value={callText}
        onChangeText={setCallText}
        placeholder="A trabajar Senal de Trading"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
      </TouchableOpacity>

      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => navigation.navigate('Alarm', {})}>
          <Text style={styles.navLink}>Configurar alarma</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('History')}>
          <Text style={styles.navLink}>Ver historial</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  hint: { fontSize: 13, color: '#666', marginBottom: 8, lineHeight: 18 },
  chatList: { maxHeight: 180, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  chatItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  chatItemSelected: { backgroundColor: '#e3f2fd' },
  empty: { padding: 12, color: '#888' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginRight: 8 },
  callTextInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginTop: 4 },
  addButton: { backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  addButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: {
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontSize: 14 },
  saveButton: { backgroundColor: '#2e7d32', borderRadius: 8, padding: 14, marginTop: 20, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  navLink: { color: '#1976d2', fontWeight: '600' },
});
