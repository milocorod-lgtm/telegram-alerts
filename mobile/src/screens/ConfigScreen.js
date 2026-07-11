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
  ScrollView,
} from 'react-native';
import { fetchChats, addRule } from '../services/telegramService';
import {
  getRingtonePreference,
  setRingtonePreference,
  getVibrationPreference,
  setVibrationPreference,
  pickRingtone,
  previewRingtone,
  stopPreview,
} from '../services/alarmService';

export default function ConfigScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [mode, setMode] = useState('keywords'); // 'all' | 'keywords'
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [callText, setCallText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ringtone, setRingtone] = useState(null);
  const [vibration, setVibration] = useState(true);

  useEffect(() => {
    load();
    (async () => {
      setRingtone(await getRingtonePreference());
      setVibration(await getVibrationPreference());
    })();
    return () => stopPreview();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const chatList = await fetchChats();
      setChats(chatList);
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar con el backend: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePickTone() {
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

  function handlePreviewTone() {
    try {
      previewRingtone(ringtone && ringtone.uri);
    } catch (e) {
      Alert.alert('Error', 'No se pudo reproducir el tono: ' + e.message);
    }
  }

  async function handleVibrationToggle(value) {
    setVibration(value);
    await setVibrationPreference(value);
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

  function resetForm() {
    setSelectedChat(null);
    setMode('keywords');
    setKeywords([]);
    setKeywordInput('');
    setCallText('');
  }

  async function handleSave() {
    if (!selectedChat) {
      Alert.alert('Falta el canal', 'Elige el canal a monitorear');
      return;
    }
    if (mode === 'keywords' && keywords.length === 0) {
      Alert.alert('Faltan palabras', 'Agrega al menos una palabra clave, o activa "Todo el chat"');
      return;
    }
    setSaving(true);
    try {
      await addRule({
        chatId: selectedChat.chat_id,
        chatName: selectedChat.name,
        mode,
        keywords,
        callText,
      });
      Alert.alert('Guardado', 'Canal agregado. Puedes ver todo en la pestaña "Estado".', [
        { text: 'Agregar otro', onPress: resetForm },
        { text: 'Ver Estado', onPress: () => navigation.navigate('Estado') },
      ]);
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.label}>Canal a monitorear</Text>
      <View style={styles.chatList}>
        {chats.length === 0 ? (
          <Text style={styles.empty}>No se encontraron chats. Revisa que el backend este conectado.</Text>
        ) : (
          chats.map((item) => (
            <TouchableOpacity
              key={item.chat_id}
              style={[
                styles.chatItem,
                selectedChat && selectedChat.chat_id === item.chat_id && styles.chatItemSelected,
              ]}
              onPress={() => setSelectedChat(item)}
            >
              <Text>{item.name}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Todo el chat</Text>
        <Switch value={mode === 'all'} onValueChange={(v) => setMode(v ? 'all' : 'keywords')} />
      </View>

      {mode === 'keywords' && (
        <View>
          <Text style={styles.label}>Palabras clave</Text>
          <Text style={styles.hint}>
            Sé muy específico: escribe la frase EXACTA que dispara la alarma (ej:
            "XAUUSD SELL"), no una palabra suelta. Los espacios de más y saltos de
            línea se ignoran, pero el orden de las palabras sí importa.
          </Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={keywordInput}
              onChangeText={setKeywordInput}
              placeholder="ej: XAUUSD SELL"
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

      <Text style={styles.label}>Texto que aparece en la alerta</Text>
      <Text style={styles.hint}>
        Lo que veras cuando se dispare (ej: "A trabajar Señal de Trading"). Si lo
        dejas vacio, se muestra el canal y la palabra detectada.
      </Text>
      <TextInput
        style={styles.callTextInput}
        value={callText}
        onChangeText={setCallText}
        placeholder="A trabajar Señal de Trading"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar canal'}</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Tono y vibración (para todas las alertas)</Text>
      <Text style={styles.ringtoneName}>{(ringtone && ringtone.title) || 'Tono predeterminado'}</Text>
      <View style={styles.toneRow}>
        <TouchableOpacity style={styles.toneButton} onPress={handlePickTone}>
          <Text style={styles.toneButtonText}>Elegir tono</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toneButton, styles.toneSecondary]} onPress={handlePreviewTone}>
          <Text style={styles.toneButtonText}>Escuchar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toneButton, styles.toneSecondary]} onPress={stopPreview}>
          <Text style={styles.toneButtonText}>Detener</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Vibración</Text>
        <Switch value={vibration} onValueChange={handleVibrationToggle} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  hint: { fontSize: 13, color: '#666', marginBottom: 8, lineHeight: 18 },
  chatList: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
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
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  ringtoneName: { fontSize: 14, color: '#555', marginBottom: 10 },
  toneRow: { flexDirection: 'row', flexWrap: 'wrap' },
  toneButton: { backgroundColor: '#1976d2', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginRight: 8, marginBottom: 8 },
  toneSecondary: { backgroundColor: '#555' },
  toneButtonText: { color: '#fff', fontWeight: '600' },
});
