import { API_BASE_URL } from '../config';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status} llamando a ${path}`);
  }
  return res.json();
}

export function fetchChats() {
  return request('/api/chats');
}

export function fetchConfig() {
  return request('/api/config');
}

export function saveConfig({ chatId, chatName, mode, keywords }) {
  return request('/api/config', {
    method: 'POST',
    body: JSON.stringify({
      chat_id: chatId,
      chat_name: chatName,
      mode,
      keywords,
    }),
  });
}

export function fetchHistory() {
  return request('/api/history');
}

export function registerDevice(fcmToken) {
  return request('/api/device', {
    method: 'POST',
    body: JSON.stringify({ fcm_token: fcmToken }),
  });
}
