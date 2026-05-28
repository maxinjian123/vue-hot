import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export function getKeywords() {
  return api.get('/keywords');
}

export function createKeyword(data) {
  return api.post('/keywords', data);
}

export function updateKeyword(id, data) {
  return api.put(`/keywords/${id}`, data);
}

export function deleteKeyword(id) {
  return api.delete(`/keywords/${id}`);
}

export function getHotTopics(params) {
  return api.get('/hot-topics', { params });
}

export function getNotifications(params) {
  return api.get('/notifications', { params });
}

export function markNotificationRead(id) {
  return api.put(`/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return api.put('/notifications/read-all');
}

export function getSettings() {
  return api.get('/settings');
}

export function updateSetting(key, value) {
  return api.put(`/settings/${key}`, { value });
}

export function checkHealth() {
  return api.get('/health');
}

export function searchWeb(params) {
  return api.get('/search', { params, timeout: 60000 });
}

export function getSearchSuggestions(params) {
  return api.get('/search/suggestions', { params, timeout: 5000 });
}

export function getDashboardStats() {
  return api.get('/dashboard/stats');
}

export function getTopicTrend(id, days = 7) {
  return api.get(`/hot-topics/${id}/trend`, { params: { days } });
}
