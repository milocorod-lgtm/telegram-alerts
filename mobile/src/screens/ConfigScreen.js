import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
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
import theme from '../theme';

export default function ConfigScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [mode, setMode] = useState('keywords');
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

  function addKeyword() {
    const value = keywordInput.trim();
    if (!value) return;
    if (!keywords.includes(value)) setKeywords([...keywords, value]);
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
      Alert.alert('Guardado', 'Canal agregado. Puedes verlo en la pestaña "Estado".', [
        { text: 'Agregar otro', onPress: resetForm },
        { text: 'Ver Estado', onPress: () => navigation.navigate('Estado') },
      ]);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar: ' + e.message);
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={theme.cyan} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Configurar</Text>
        <Text style={styles.sub}>Agrega uno o varios canales a vigilar.</Text>

        <Text style={styles.label}>CANAL A MONITOREAR</Text>
        <View style={styles.panel}>
          {chats.length === 0 ? (
            <Text style={styles.empty}>No se encontraron chats. Revisa la conexión del backend.</Text>
          ) : (
            chats.map((item, i) => {
              const on = selectedChat && selectedChat.chat_id === item.chat_id;
              return (
                <TouchableOpacity
                  key={item.chat_id}
                  activeOpacity={0.7}
                  style={[styles.chatItem, i > 0 && styles.chatDivider, on && styles.chatItemOn]}
                  onPress={() => setSelectedChat(item)}
                >
                  <View style={[styles.radio, on && styles.radioOn]}>
                    {on ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={[styles.chatName, on && { color: theme.text }]}>{item.name}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Todo el chat</Text>
            <Text style={styles.switchHint}>Alerta con cualquier mensaje</Text>
          </View>
          <Switch
            value={mode === 'all'}
            onValueChange={(v) => setMode(v ? 'all' : 'keywords')}
            trackColor={{ true: theme.blue, false: '#2A3550' }}
            thumbColor={mode === 'all' ? theme.cyan : '#8090B0'}
          />
        </View>

        {mode === 'keywords' && (
          <View>
            <Text style={styles.label}>PALABRAS CLAVE</Text>
            <Text style={styles.hint}>
              Escribe la frase EXACTA que dispara la alarma (ej: "XAUUSD SELL"). Los espacios de
              más y saltos de línea se ignoran; el orden sí importa.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={keywordInput}
                onChangeText={setKeywordInput}
                placeholder="ej: XAUUSD SELL"
                placeholderTextColor={theme.textMuted}
                onSubmitEditing={addKeyword}
              />
              <TouchableOpacity onPress={addKeyword} activeOpacity={0.85}>
                <LinearGradient colors={theme.gradPrimary} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>+</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={styles.chips}>
              {keywords.map((word) => (
                <TouchableOpacity key={word} style={styles.chip} onPress={() => removeKeyword(word)}>
                  <Text style={styles.chipText}>{word}</Text>
                  <Text style={styles.chipX}>  ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.label}>TEXTO EN LA ALERTA</Text>
        <Text style={styles.hint}>
          Lo que verás al dispararse (ej: "A trabajar Señal de Trading"). Vacío = canal + palabra.
        </Text>
        <TextInput
          style={styles.input}
          value={callText}
          onChangeText={setCallText}
          placeholder="A trabajar Señal de Trading"
          placeholderTextColor={theme.textMuted}
        />

        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={{ marginTop: 22 }}>
          <LinearGradient
            colors={theme.gradPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar canal'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.label}>TONO Y VIBRACIÓN</Text>
        <Text style={styles.hint}>Aplica a todas las alertas.</Text>
        <View style={styles.tonePanel}>
          <Text style={styles.toneName}>♪ {(ringtone && ringtone.title) || 'Tono predeterminado'}</Text>
          <View style={styles.toneRow}>
            <TouchableOpacity style={styles.toneBtn} onPress={handlePickTone}>
              <Text style={styles.toneBtnText}>Elegir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toneBtn} onPress={handlePreviewTone}>
              <Text style={styles.toneBtnText}>Escuchar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toneBtn} onPress={stopPreview}>
              <Text style={styles.toneBtnText}>Detener</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.switchRow, { marginTop: 6 }]}>
            <Text style={styles.switchLabel}>Vibración</Text>
            <Switch
              value={vibration}
              onValueChange={handleVibrationToggle}
              trackColor={{ true: theme.blue, false: '#2A3550' }}
              thumbColor={vibration ? theme.cyan : '#8090B0'}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  h1: { color: theme.text, fontSize: 26, fontWeight: '800', marginTop: 8 },
  sub: { color: theme.textDim, fontSize: 14, marginTop: 4, marginBottom: 8 },
  label: { color: theme.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 22, marginBottom: 8 },
  hint: { color: theme.textDim, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  panel: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 14, overflow: 'hidden' },
  empty: { color: theme.textMuted, padding: 16 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  chatDivider: { borderTopWidth: 1, borderTopColor: theme.border },
  chatItemOn: { backgroundColor: 'rgba(34, 211, 238, 0.08)' },
  chatName: { color: theme.textDim, fontSize: 15, flex: 1 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.borderStrong,
    marginRight: 12, justifyContent: 'center', alignItems: 'center',
  },
  radioOn: { borderColor: theme.cyan },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.cyan },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 14, padding: 16, marginTop: 16,
  },
  switchLabel: { color: theme.text, fontSize: 15, fontWeight: '600' },
  switchHint: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: theme.text, fontSize: 15,
  },
  addBtn: { width: 48, height: 48, borderRadius: 12, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#04121F', fontSize: 24, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(230, 200, 120, 0.10)', borderWidth: 1, borderColor: 'rgba(230, 200, 120, 0.35)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8,
  },
  chipText: { color: theme.gold, fontSize: 14, fontWeight: '600' },
  chipX: { color: theme.goldDim, fontSize: 13 },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#04121F', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 28 },
  tonePanel: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 16 },
  toneName: { color: theme.text, fontSize: 15, marginBottom: 12 },
  toneRow: { flexDirection: 'row', flexWrap: 'wrap' },
  toneBtn: {
    backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.borderStrong,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginRight: 8, marginBottom: 8,
  },
  toneBtnText: { color: theme.text, fontWeight: '600', fontSize: 14 },
});
