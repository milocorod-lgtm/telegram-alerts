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

export function fetchRules() {
  return request('/api/rules');
}

export function addRule({ chatId, chatName, mode, keywords, callText }) {
  return request('/api/rules', {
    method: 'POST',
    body: JSON.stringify({
      chat_id: chatId,
      chat_name: chatName,
      mode,
      keywords,
      call_text: callText || '',
    }),
  });
}

export function deleteRule(id) {
  return request(`/api/rules/${id}`, { method: 'DELETE' });
}

export function resetAll() {
  return request('/api/reset', { method: 'POST' });
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
